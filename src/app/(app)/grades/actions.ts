"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContexte } from "@/lib/tenant";
import { peutNoter } from "@/lib/notes-donnees";
import { lireNote, type StatutNoteSaisie } from "@/lib/notes";

// ─── Créer une évaluation ──────────────────────────

const schemaEvaluation = z.object({
  sessionId: z.string().min(1),
  matiereId: z.string().min(1),
  intitule: z.string().trim().min(2, "Indiquez l'intitulé (ex. Devoir 1).").max(60, "60 caractères maximum."),
  type: z.enum(["DEVOIR", "EXAMEN", "TP", "ORAL", "PROJET", "AUTRE"]),
  date: z.string().optional(),
  poids: z.coerce.number().int("Poids entier (en %).").min(1, "Poids d'au moins 1 %.").max(100, "100 % maximum."),
  bareme: z.coerce.number().int("Barème entier.").min(1, "Barème invalide.").max(100, "Barème de 100 maximum."),
});

export type EtatEvaluation = { erreur: string | null; succes: number };

export async function creerEvaluation(etat: EtatEvaluation, formData: FormData): Promise<EtatEvaluation> {
  const { institut, membre, db } = await getContexte();
  const echec = (erreur: string): EtatEvaluation => ({ erreur, succes: etat.succes });

  const resultat = schemaEvaluation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return echec(resultat.error.issues[0].message);
  }
  const d = resultat.data;

  const session = await db.session.findFirst({ where: { id: d.sessionId } });
  const matiere = session
    ? await db.matiere.findFirst({ where: { id: d.matiereId, formationId: session.formationId, active: true } })
    : null;
  if (!session || !matiere) {
    return echec("Classe ou matière introuvable.");
  }
  if (!(await peutNoter(db, membre, session.id, matiere.id))) {
    return echec("Vous ne pouvez créer des évaluations que pour vos propres matières.");
  }

  // Le total des poids d'une matière ne dépasse pas 100 %
  const existantes = await db.evaluation.aggregate({
    where: { sessionId: session.id, matiereId: matiere.id },
    _sum: { poids: true },
  });
  const total = (existantes._sum.poids ?? 0) + d.poids;
  if (total > 100) {
    return echec(`Le total des poids de ${matiere.intitule} atteindrait ${total} % (100 % maximum).`);
  }

  await db.evaluation.create({
    data: {
      institutId: institut.id,
      sessionId: session.id,
      matiereId: matiere.id,
      intitule: d.intitule,
      type: d.type,
      date: d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? new Date(d.date) : null,
      poids: d.poids,
      bareme: d.bareme,
      creeParId: membre.id,
    },
  });

  revalidatePath("/grades");
  return { erreur: null, succes: etat.succes + 1 };
}

// Supprimer : seulement une évaluation sans note et non verrouillée
export async function supprimerEvaluation(formData: FormData): Promise<void> {
  const { membre, db } = await getContexte();
  const id = String(formData.get("id") ?? "");

  const evaluation = await db.evaluation.findFirst({
    where: { id },
    include: { _count: { select: { notes: true } } },
  });
  if (!evaluation || evaluation.verrouillee || evaluation._count.notes > 0) return;
  if (!(await peutNoter(db, membre, evaluation.sessionId, evaluation.matiereId))) return;

  await db.evaluation.delete({ where: { id: evaluation.id } });
  revalidatePath("/grades");
}

// Verrouiller / déverrouiller (direction) : une évaluation verrouillée n'est plus modifiable
export async function basculerVerrou(formData: FormData): Promise<void> {
  const { institut, membre, db } = await getContexte();
  if (membre.role !== "DIRECTEUR") return;
  const id = String(formData.get("id") ?? "");

  const evaluation = await db.evaluation.findFirst({ where: { id } });
  if (!evaluation) return;

  await db.evaluation.update({ where: { id: evaluation.id }, data: { verrouillee: !evaluation.verrouillee } });
  await db.journalAudit.create({
    data: {
      institutId: institut.id,
      auteurId: membre.utilisateurId,
      action: evaluation.verrouillee ? "EVALUATION_DEVERROUILLEE" : "EVALUATION_VERROUILLEE",
      entite: "Evaluation",
      entiteId: evaluation.id,
      apres: { intitule: evaluation.intitule },
    },
  });

  revalidatePath("/grades");
  revalidatePath("/grades/entry");
}

// ─── Saisir les notes d'une évaluation ─────────────

export type EtatSaisie = { erreur: string | null; enregistre: boolean; erreursLignes: string[] };

export async function enregistrerNotes(_etat: EtatSaisie, formData: FormData): Promise<EtatSaisie> {
  const { institut, membre, db } = await getContexte();
  const evaluationId = String(formData.get("evaluationId") ?? "");

  const evaluation = await db.evaluation.findFirst({ where: { id: evaluationId } });
  if (!evaluation) {
    return { erreur: "Évaluation introuvable.", enregistre: false, erreursLignes: [] };
  }
  if (evaluation.verrouillee) {
    return { erreur: "Cette évaluation est verrouillée : les notes ne sont plus modifiables.", enregistre: false, erreursLignes: [] };
  }
  if (!(await peutNoter(db, membre, evaluation.sessionId, evaluation.matiereId))) {
    return { erreur: "Vous ne pouvez saisir que les notes de vos propres matières.", enregistre: false, erreursLignes: [] };
  }

  const inscriptions = await db.inscription.findMany({
    where: { sessionId: evaluation.sessionId, statut: { in: ["ACTIVE", "TERMINEE"] } },
    include: { apprenant: { select: { prenom: true, nom: true } } },
  });

  const aEnregistrer: { inscriptionId: string; statut: StatutNoteSaisie; valeur: number | null }[] = [];
  const aEffacer: string[] = [];
  const erreursLignes: string[] = [];

  for (const i of inscriptions) {
    const statut = String(formData.get(`s_${i.id}`) ?? "NOTEE") as StatutNoteSaisie;
    const saisie = String(formData.get(`n_${i.id}`) ?? "");
    if (statut === "ABSENT" || statut === "DISPENSE") {
      aEnregistrer.push({ inscriptionId: i.id, statut, valeur: null });
    } else if (saisie.trim() === "") {
      aEffacer.push(i.id); // pas de note : l'élève n'est pas encore noté
    } else {
      const valeur = lireNote(saisie, evaluation.bareme);
      if (valeur === null) {
        erreursLignes.push(`${i.apprenant.prenom} ${i.apprenant.nom} : « ${saisie} » n'est pas une note valide (0 à ${evaluation.bareme}).`);
      } else {
        aEnregistrer.push({ inscriptionId: i.id, statut: "NOTEE", valeur });
      }
    }
  }

  if (erreursLignes.length > 0) {
    return { erreur: "Certaines notes sont invalides : rien n'a été enregistré.", enregistre: false, erreursLignes };
  }

  await db.$transaction(async (tx) => {
    for (const n of aEnregistrer) {
      await tx.note.upsert({
        where: { evaluationId_inscriptionId: { evaluationId: evaluation.id, inscriptionId: n.inscriptionId } },
        create: {
          institutId: institut.id,
          evaluationId: evaluation.id,
          inscriptionId: n.inscriptionId,
          statut: n.statut,
          valeur: n.valeur,
          saisieParId: membre.id,
        },
        update: { statut: n.statut, valeur: n.valeur, saisieParId: membre.id },
      });
    }
    if (aEffacer.length > 0) {
      await tx.note.deleteMany({ where: { evaluationId: evaluation.id, inscriptionId: { in: aEffacer } } });
    }
  });

  revalidatePath("/grades");
  revalidatePath("/grades/entry");
  revalidatePath("/grades/results");
  return { erreur: null, enregistre: true, erreursLignes: [] };
}
