import "server-only";
import type { Prisma } from "@prisma/client";
import type { DbInstitut } from "@/lib/prisma";
import { dateDuJour } from "@/lib/echeancier";
import { formatDate } from "@/lib/format";
import type { CreneauAffiche } from "@/lib/emploi-du-temps";
import { nomEnseignant } from "@/lib/enseignants";

export type Vue = "classe" | "enseignant" | "salle";

export type EmploiDuTemps = {
  titre: string;
  sousTitre: string;
  creneaux: CreneauAffiche[];
};

const INCLURE = {
  session: {
    select: {
      nom: true,
      formation: { select: { intitule: true } },
      anneeAcademique: { select: { libelle: true } },
    },
  },
  enseignant: { select: { prenom: true, nom: true } },
  salle: { select: { nom: true } },
} satisfies Prisma.CreneauInclude;

function nomProf(c: CreneauCharge): string | undefined {
  return c.enseignant ? nomEnseignant(c.enseignant) : undefined;
}

type CreneauCharge = Prisma.CreneauGetPayload<{ include: typeof INCLURE }>;

const TRI = [{ jour: "asc" as const }, { heureDebut: "asc" as const }];

function versAffichage(c: CreneauCharge, details: (string | null | undefined)[]): CreneauAffiche {
  return {
    id: c.id,
    jour: c.jour,
    heureDebut: c.heureDebut,
    heureFin: c.heureFin,
    matiere: c.matiere,
    details: details.filter((d): d is string => Boolean(d)),
  };
}

// Charge l'emploi du temps d'une classe (session), d'un enseignant ou d'une salle.
// Pour l'enseignant et la salle, seules les sessions non terminées comptent.
export async function chargerEmploiDuTemps(
  db: DbInstitut,
  vue: Vue,
  id: string,
): Promise<EmploiDuTemps | null> {
  const sessionsEnCours = { dateFin: { gte: dateDuJour() } };

  if (vue === "classe") {
    const session = await db.session.findFirst({
      where: { id },
      include: {
        formation: { select: { intitule: true } },
        anneeAcademique: { select: { libelle: true } },
      },
    });
    if (!session) {
      return null;
    }
    const creneaux = await db.creneau.findMany({ where: { sessionId: id }, include: INCLURE, orderBy: TRI });
    return {
      titre: session.formation.intitule,
      sousTitre: [
        session.anneeAcademique?.libelle,
        session.nom,
        `du ${formatDate(session.dateDebut)} au ${formatDate(session.dateFin)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      creneaux: creneaux.map((c) => versAffichage(c, [nomProf(c), c.salle?.nom])),
    };
  }

  if (vue === "enseignant") {
    const enseignant = await db.enseignant.findFirst({ where: { id } });
    if (!enseignant) {
      return null;
    }
    const creneaux = await db.creneau.findMany({
      where: { enseignantId: id, session: sessionsEnCours },
      include: INCLURE,
      orderBy: TRI,
    });
    return {
      titre: nomEnseignant(enseignant),
      sousTitre: [
        "Programmation hebdomadaire",
        enseignant.specialite,
        enseignant.statut === "VACATAIRE" ? "Vacataire" : "Permanent",
      ]
        .filter(Boolean)
        .join(" · "),
      creneaux: creneaux.map((c) => versAffichage(c, [c.session.formation.intitule, c.salle?.nom])),
    };
  }

  const salle = await db.salle.findFirst({ where: { id } });
  if (!salle) {
    return null;
  }
  const creneaux = await db.creneau.findMany({
    where: { salleId: id, session: sessionsEnCours },
    include: INCLURE,
    orderBy: TRI,
  });
  return {
    titre: salle.nom,
    sousTitre: `Occupation de la salle${salle.capacite ? ` · ${salle.capacite} places` : ""}`,
    creneaux: creneaux.map((c) =>
      versAffichage(c, [c.session.formation.intitule, nomProf(c)]),
    ),
  };
}
