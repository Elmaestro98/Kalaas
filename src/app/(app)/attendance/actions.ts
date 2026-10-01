"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexte } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { JOURS_RATTRAPAGE_FORMATEUR, dateIso, jourDeDate, lireDate, type StatutPresence } from "@/lib/presences";

const STATUTS: StatutPresence[] = ["PRESENT", "ABSENT", "RETARD", "EXCUSE"];
const JOUR_MS = 86_400_000;

export type EtatAppel = { erreur: string | null };

export async function enregistrerAppel(_etat: EtatAppel, formData: FormData): Promise<EtatAppel> {
  const { institut, membre, db } = await getContexte();

  const creneauId = String(formData.get("creneauId") ?? "");
  const date = lireDate(String(formData.get("date") ?? ""));
  if (!date) {
    return { erreur: "Date invalide." };
  }

  // Le cours doit exister dans l'établissement (filtre db)
  const creneau = await db.creneau.findFirst({ where: { id: creneauId }, include: { session: true } });
  if (!creneau) {
    return { erreur: "Cours introuvable." };
  }

  // Qui peut faire l'appel : direction et scolarité pour tous les cours,
  // un formateur seulement pour ses propres cours
  if (membre.role === "FORMATEUR") {
    const maFiche = await db.enseignant.findFirst({ where: { membreId: membre.id } });
    if (!maFiche || creneau.enseignantId !== maFiche.id) {
      return { erreur: "Vous ne pouvez faire l'appel que pour vos propres cours." };
    }
    if (date.getTime() < dateDuJour().getTime() - JOURS_RATTRAPAGE_FORMATEUR * JOUR_MS) {
      return { erreur: `Un appel peut être complété jusqu'à ${JOURS_RATTRAPAGE_FORMATEUR} jours après le cours.` };
    }
  }

  // La date doit correspondre au cours : bon jour de la semaine, pendant la session, pas dans le futur
  if (date > dateDuJour()) {
    return { erreur: "On ne peut pas faire l'appel d'un cours à venir." };
  }
  if (jourDeDate(date) !== creneau.jour || date < creneau.session.dateDebut || date > creneau.session.dateFin) {
    return { erreur: "Ce cours n'a pas lieu à cette date." };
  }

  // Apprenants inscrits (actifs) dans la classe
  const inscriptions = await db.inscription.findMany({
    where: { sessionId: creneau.sessionId, statut: "ACTIVE" },
    select: { id: true },
  });
  if (inscriptions.length === 0) {
    return { erreur: "Aucun apprenant inscrit dans cette classe." };
  }

  const statuts = inscriptions.map((i) => {
    const valeur = String(formData.get(`p_${i.id}`) ?? "PRESENT");
    return { inscriptionId: i.id, statut: (STATUTS.includes(valeur as StatutPresence) ? valeur : "PRESENT") as StatutPresence };
  });

  try {
    await db.$transaction(async (tx) => {
      const seance = await tx.seance.upsert({
        where: { sessionId_date_creneauId: { sessionId: creneau.sessionId, date, creneauId: creneau.id } },
        create: {
          institutId: institut.id,
          sessionId: creneau.sessionId,
          creneauId: creneau.id,
          date,
          matiere: creneau.matiere,
          matiereId: creneau.matiereId,
          // Professeur du cours au moment de l'appel : base des heures réalisées (paie des vacataires)
          enseignantId: creneau.enseignantId,
          heureDebut: creneau.heureDebut,
          heureFin: creneau.heureFin,
          appelParId: membre.id,
        },
        update: { appelParId: membre.id },
      });

      for (const s of statuts) {
        await tx.presence.upsert({
          where: { seanceId_inscriptionId: { seanceId: seance.id, inscriptionId: s.inscriptionId } },
          create: { institutId: institut.id, seanceId: seance.id, inscriptionId: s.inscriptionId, statut: s.statut },
          update: { statut: s.statut },
        });
      }
    });
  } catch {
    return { erreur: "L'enregistrement de l'appel a échoué. Réessayez." };
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect(`/attendance?date=${dateIso(date)}&ok=1`);
}
