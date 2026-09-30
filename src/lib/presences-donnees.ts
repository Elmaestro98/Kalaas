import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { nomEnseignant } from "@/lib/enseignants";
import { jourDeDate } from "@/lib/presences";

export type CoursDuJour = {
  creneauId: string;
  sessionId: string;
  matiere: string;
  heureDebut: number;
  heureFin: number;
  classe: string;
  enseignant: string | null;
  salle: string | null;
  appel: { presents: number; total: number } | null; // null = appel pas encore fait
};

// Cours prévus à une date (d'après l'emploi du temps), avec l'état de l'appel.
// enseignantId : ne garder que les cours d'un professeur (vue formateur).
export async function chargerCoursDuJour(
  db: DbInstitut,
  date: Date,
  enseignantId?: string,
): Promise<CoursDuJour[]> {
  const creneaux = await db.creneau.findMany({
    where: {
      jour: jourDeDate(date),
      ...(enseignantId ? { enseignantId } : {}),
      session: { dateDebut: { lte: date }, dateFin: { gte: date } },
    },
    orderBy: { heureDebut: "asc" },
    include: {
      session: { select: { id: true, nom: true, formation: { select: { intitule: true } } } },
      enseignant: { select: { prenom: true, nom: true } },
      salle: { select: { nom: true } },
      seances: {
        where: { date },
        select: { presences: { select: { statut: true } } },
      },
    },
  });

  return creneaux.map((c) => {
    const seance = c.seances[0];
    return {
      creneauId: c.id,
      sessionId: c.session.id,
      matiere: c.matiere,
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      classe: `${c.session.formation.intitule} · ${c.session.nom}`,
      enseignant: c.enseignant ? nomEnseignant(c.enseignant) : null,
      salle: c.salle?.nom ?? null,
      appel: seance
        ? {
            presents: seance.presences.filter((p) => p.statut === "PRESENT" || p.statut === "RETARD").length,
            total: seance.presences.length,
          }
        : null,
    };
  });
}
