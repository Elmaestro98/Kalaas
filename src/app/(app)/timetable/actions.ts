"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";
import { JOURS, formatHeure, heureVersMinutes } from "@/lib/emploi-du-temps";
import { nomEnseignant } from "@/lib/enseignants";

const HEURE_MIN = 6 * 60; // 06h00
const HEURE_MAX = 23 * 60; // 23h00

const schemaCreneau = z
  .object({
    sessionId: z.string().min(1),
    jour: z.enum(["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"], "Choisissez le jour."),
    heureDebut: z.string().refine((v) => heureVersMinutes(v) !== null, "Heure de début invalide."),
    heureFin: z.string().refine((v) => heureVersMinutes(v) !== null, "Heure de fin invalide."),
    matiereId: z.string().min(1, "Choisissez la matière."),
    enseignantId: z.string(),
    salleId: z.string(),
  })
  .superRefine((d, ctx) => {
    const debut = heureVersMinutes(d.heureDebut);
    const fin = heureVersMinutes(d.heureFin);
    if (debut === null || fin === null) {
      return;
    }
    if (fin <= debut) {
      ctx.addIssue({ code: "custom", path: ["heureFin"], message: "La fin doit être après le début." });
    }
    if (debut < HEURE_MIN || fin > HEURE_MAX) {
      ctx.addIssue({ code: "custom", path: ["heureDebut"], message: "Les cours ont lieu entre 06h00 et 23h00." });
    }
  });

export type ChampCreneau = "jour" | "heureDebut" | "heureFin" | "matiereId" | "enseignantId" | "salleId";

export type EtatCreneau = {
  erreurs: Partial<Record<ChampCreneau, string>>;
  erreurGenerale: string | null;
  succes: number; // incrémenté à chaque ajout réussi (pour vider le formulaire)
};

export async function ajouterCreneau(_etat: EtatCreneau, formData: FormData): Promise<EtatCreneau> {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const echec = (e: Partial<EtatCreneau>): EtatCreneau => ({
    erreurs: {},
    erreurGenerale: null,
    succes: _etat.succes,
    ...e,
  });

  const resultat = schemaCreneau.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatCreneau["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0] && champ !== "sessionId") {
        erreurs[champ as ChampCreneau] = messages[0];
      }
    }
    return echec({ erreurs });
  }
  const d = resultat.data;
  const debut = heureVersMinutes(d.heureDebut)!;
  const fin = heureVersMinutes(d.heureFin)!;

  // Chaque identifiant reçu est revérifié via db (filtré par établissement)
  const session = await db.session.findFirst({ where: { id: d.sessionId } });
  if (!session) {
    return echec({ erreurGenerale: "Session introuvable." });
  }
  // La matière doit appartenir au programme de la formation de cette classe
  const matiere = await db.matiere.findFirst({
    where: { id: d.matiereId, formationId: session.formationId, active: true },
  });
  if (!matiere) {
    return echec({ erreurs: { matiereId: "Cette matière ne fait pas partie du programme de la formation." } });
  }
  if (d.enseignantId && !(await db.enseignant.findFirst({ where: { id: d.enseignantId, actif: true } }))) {
    return echec({ erreurs: { enseignantId: "Enseignant introuvable." } });
  }
  if (d.salleId && !(await db.salle.findFirst({ where: { id: d.salleId, active: true } }))) {
    return echec({ erreurs: { salleId: "Salle introuvable." } });
  }

  // Conflits : même jour, horaires qui se chevauchent, sessions dont les périodes se croisent,
  // et même classe, même enseignant ou même salle.
  const cibles: object[] = [{ sessionId: session.id }];
  if (d.enseignantId) cibles.push({ enseignantId: d.enseignantId });
  if (d.salleId) cibles.push({ salleId: d.salleId });

  const conflit = await db.creneau.findFirst({
    where: {
      jour: d.jour,
      heureDebut: { lt: fin },
      heureFin: { gt: debut },
      session: { dateDebut: { lte: session.dateFin }, dateFin: { gte: session.dateDebut } },
      OR: cibles,
    },
    include: {
      session: { select: { nom: true, formation: { select: { intitule: true } } } },
      enseignant: { select: { prenom: true, nom: true } },
      salle: { select: { nom: true } },
    },
  });

  if (conflit) {
    const horaire = `${formatHeure(conflit.heureDebut)}–${formatHeure(conflit.heureFin)}`;
    const jour = JOURS.find((j) => j.valeur === d.jour)?.label.toLowerCase();
    let message: string;
    if (conflit.sessionId === session.id) {
      message = `Cette classe a déjà « ${conflit.matiere} » le ${jour} de ${horaire}.`;
    } else if (d.enseignantId && conflit.enseignantId === d.enseignantId) {
      message = `${conflit.enseignant ? nomEnseignant(conflit.enseignant) : "Ce professeur"} enseigne déjà « ${conflit.matiere} » (${conflit.session.formation.intitule}) le ${jour} de ${horaire}.`;
    } else {
      message = `La salle ${conflit.salle?.nom} est déjà occupée le ${jour} de ${horaire} (${conflit.session.formation.intitule}).`;
    }
    return echec({ erreurGenerale: message });
  }

  try {
    await db.creneau.create({
      data: {
        institutId: institut.id,
        sessionId: session.id,
        jour: d.jour,
        heureDebut: debut,
        heureFin: fin,
        matiere: matiere.intitule,
        matiereId: matiere.id,
        enseignantId: d.enseignantId || null,
        salleId: d.salleId || null,
      },
    });
  } catch {
    return echec({ erreurGenerale: "L'enregistrement a échoué. Réessayez." });
  }

  revalidatePath("/timetable");
  return { erreurs: {}, erreurGenerale: null, succes: _etat.succes + 1 };
}

export async function supprimerCreneau(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const creneau = await db.creneau.findFirst({ where: { id } });
  if (!creneau) {
    return;
  }
  await db.creneau.delete({ where: { id: creneau.id } });
  revalidatePath("/timetable");
}
