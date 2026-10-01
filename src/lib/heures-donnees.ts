import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { dateDuJour } from "@/lib/echeancier";
import { nomEnseignant } from "@/lib/enseignants";
import { jourDeDate } from "@/lib/presences";

const JOUR_MS = 86_400_000;

export type LigneHeures = {
  enseignantId: string;
  nom: string;
  statut: "PERMANENT" | "VACATAIRE";
  tarifHoraire: number | null;
  heures: number; // heures réalisées (appels faits) dans le mois
  montant: number | null; // heures × tarif horaire
  coursFaits: number;
  coursSansAppel: number; // cours prévus à l'emploi du temps, passés, sans appel
  detail: { classe: string; matiere: string; heures: number }[];
};

// « 2026-10 » → { debut: 1er octobre, fin: 1er novembre } (UTC), ou le mois courant
export function lireMois(saisie: string | undefined): { debut: Date; fin: Date; cle: string } {
  const aujourdhui = dateDuJour();
  const m = /^(\d{4})-(\d{2})$/.exec(saisie ?? "");
  const annee = m ? Number(m[1]) : aujourdhui.getUTCFullYear();
  const mois = m ? Number(m[2]) - 1 : aujourdhui.getUTCMonth();
  const debut = new Date(Date.UTC(annee, mois, 1));
  const fin = new Date(Date.UTC(annee, mois + 1, 1));
  return { debut, fin, cle: `${annee}-${String(mois + 1).padStart(2, "0")}` };
}

// Heures réalisées par professeur sur un mois : seules comptent les séances dont l'appel a été fait
export async function etatDesHeures(db: DbInstitut, debut: Date, fin: Date): Promise<LigneHeures[]> {
  const aujourdhui = dateDuJour();
  const limite = new Date(Math.min(fin.getTime(), aujourdhui.getTime() + JOUR_MS)); // pas de cours futurs

  const [enseignants, seances, creneaux] = await Promise.all([
    db.enseignant.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    db.seance.findMany({
      where: { date: { gte: debut, lt: fin }, enseignantId: { not: null } },
      select: {
        enseignantId: true,
        creneauId: true,
        date: true,
        heureDebut: true,
        heureFin: true,
        matiere: true,
        session: { select: { nom: true, formation: { select: { intitule: true } } } },
      },
    }),
    db.creneau.findMany({
      where: {
        enseignantId: { not: null },
        session: { dateDebut: { lt: fin }, dateFin: { gte: debut } },
      },
      select: {
        id: true,
        enseignantId: true,
        jour: true,
        session: { select: { dateDebut: true, dateFin: true } },
      },
    }),
  ]);

  const seancesFaites = new Set(seances.map((s) => `${s.creneauId}|${s.date.toISOString().slice(0, 10)}`));

  // Cours prévus (passés) sans appel, par professeur
  const sansAppel = new Map<string, number>();
  for (const c of creneaux) {
    const depart = Math.max(debut.getTime(), c.session.dateDebut.getTime());
    const arrivee = Math.min(limite.getTime(), c.session.dateFin.getTime() + JOUR_MS);
    for (let t = depart; t < arrivee; t += JOUR_MS) {
      const jour = new Date(t);
      if (jourDeDate(jour) !== c.jour) continue;
      if (!seancesFaites.has(`${c.id}|${jour.toISOString().slice(0, 10)}`)) {
        sansAppel.set(c.enseignantId!, (sansAppel.get(c.enseignantId!) ?? 0) + 1);
      }
    }
  }

  const lignes: LigneHeures[] = [];
  for (const e of enseignants) {
    const siennes = seances.filter((s) => s.enseignantId === e.id);
    const manquants = sansAppel.get(e.id) ?? 0;
    if (!e.actif && siennes.length === 0) continue;

    const minutes = siennes.reduce((t, s) => t + ((s.heureFin ?? 0) - (s.heureDebut ?? 0)), 0);
    const heures = Math.round((minutes / 60) * 10) / 10;

    const parCours = new Map<string, { classe: string; matiere: string; minutes: number }>();
    for (const s of siennes) {
      const classe = `${s.session.formation.intitule} · ${s.session.nom}`;
      const cle = `${classe}|${s.matiere ?? ""}`;
      const courant = parCours.get(cle) ?? { classe, matiere: s.matiere ?? "—", minutes: 0 };
      courant.minutes += (s.heureFin ?? 0) - (s.heureDebut ?? 0);
      parCours.set(cle, courant);
    }

    lignes.push({
      enseignantId: e.id,
      nom: nomEnseignant(e),
      statut: e.statut,
      tarifHoraire: e.tarifHoraire,
      heures,
      montant: e.tarifHoraire ? Math.round(heures * e.tarifHoraire) : null,
      coursFaits: siennes.length,
      coursSansAppel: manquants,
      detail: [...parCours.values()].map((d) => ({
        classe: d.classe,
        matiere: d.matiere,
        heures: Math.round((d.minutes / 60) * 10) / 10,
      })),
    });
  }

  // Vacataires d'abord (ce sont eux qu'on paie à l'heure), puis par nom
  return lignes.sort((a, b) => (a.statut === b.statut ? a.nom.localeCompare(b.nom, "fr") : a.statut === "VACATAIRE" ? -1 : 1));
}
