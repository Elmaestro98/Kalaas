"use server";

import { revalidatePath } from "next/cache";
import { flash } from "@/lib/flash";
import { getContexte } from "@/lib/tenant";
import { estScolaire } from "@/lib/lmd";
import { peutNoter } from "@/lib/notes-donnees";
import { DISTINCTIONS, LONGUEUR_APPRECIATION, nbPeriodes, type DistinctionSaisie } from "@/lib/bulletins";

export type EtatAppreciations = { erreur: string | null; enregistre: number };

const DISTINCTIONS_VALIDES = new Set<string>(DISTINCTIONS.map((d) => d.valeur));

// Enregistre les appréciations d'une matière (professeur) ou du conseil de classe (direction) pour une période
export async function enregistrerAppreciations(etat: EtatAppreciations, formData: FormData): Promise<EtatAppreciations> {
  const { institut, membre, db } = await getContexte();
  const echec = (erreur: string): EtatAppreciations => ({ erreur, enregistre: etat.enregistre });

  const sessionId = String(formData.get("sessionId") ?? "");
  const cible = String(formData.get("cible") ?? "");
  const periode = Number(formData.get("periode"));

  const session = await db.session.findFirst({ where: { id: sessionId }, include: { formation: { select: { cycle: true } } } });
  if (!session || !estScolaire(session.formation.cycle)) {
    return echec("Classe introuvable.");
  }
  if (!Number.isInteger(periode) || periode < 1 || periode > nbPeriodes(institut.decoupageScolaire)) {
    return echec("Période invalide.");
  }

  const conseil = cible === "conseil";
  if (conseil) {
    if (membre.role !== "DIRECTEUR") return echec("Seule la direction rédige l'avis du conseil de classe.");
  } else {
    const matiere = await db.matiere.findFirst({ where: { id: cible, formationId: session.formationId } });
    if (!matiere) return echec("Matière introuvable.");
    if (!(await peutNoter(db, membre, session.id, matiere.id))) {
      return echec("Vous ne pouvez rédiger que les appréciations de vos propres matières.");
    }
  }

  const inscriptions = await db.inscription.findMany({
    where: { sessionId, statut: { in: ["ACTIVE", "TERMINEE"] } },
    select: { id: true },
  });

  const lignes = inscriptions.map((i) => {
    const texte = String(formData.get(`a_${i.id}`) ?? "").trim();
    const distinction = String(formData.get(`d_${i.id}`) ?? "");
    return {
      inscriptionId: i.id,
      texte: texte.slice(0, LONGUEUR_APPRECIATION),
      distinction: DISTINCTIONS_VALIDES.has(distinction) ? (distinction as DistinctionSaisie) : null,
    };
  });

  // Un texte vide efface l'appréciation (rien n'apparaît sur le bulletin)
  await db.$transaction(async (tx) => {
    for (const l of lignes) {
      if (conseil) {
        const cle = { inscriptionId_periode: { inscriptionId: l.inscriptionId, periode } };
        if (!l.texte && !l.distinction) {
          await tx.conseilClasse.deleteMany({ where: { inscriptionId: l.inscriptionId, periode } });
        } else {
          const donnees = { appreciation: l.texte || null, distinction: l.distinction, auteurId: membre.id };
          await tx.conseilClasse.upsert({
            where: cle,
            create: { institutId: institut.id, inscriptionId: l.inscriptionId, periode, ...donnees },
            update: donnees,
          });
        }
      } else if (!l.texte) {
        await tx.appreciationMatiere.deleteMany({ where: { inscriptionId: l.inscriptionId, periode, matiereId: cible } });
      } else {
        await tx.appreciationMatiere.upsert({
          where: { inscriptionId_periode_matiereId: { inscriptionId: l.inscriptionId, periode, matiereId: cible } },
          create: { institutId: institut.id, inscriptionId: l.inscriptionId, periode, matiereId: cible, texte: l.texte, auteurId: membre.id },
          update: { texte: l.texte, auteurId: membre.id },
        });
      }
    }
  });

  revalidatePath("/grades/report-cards");
  await flash(conseil ? "Avis du conseil de classe enregistrés." : "Appréciations enregistrées.");
  return { erreur: null, enregistre: etat.enregistre + 1 };
}
