import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { CYCLES, codeNiveau, type Cycle } from "@/lib/lmd";
import { moyenneMatiere, moyennePonderee, rang, type MoyenneMatiere, type StatutNoteSaisie } from "@/lib/notes";
import {
  moyenneAnnuelle,
  periodes as listePeriodes,
  type DecisionSaisie,
  type DecoupageSaisie,
  type DistinctionSaisie,
} from "@/lib/bulletins";

// ─── Résultats d'une classe d'école, période par période ───

export type MatiereBulletin = { id: string; intitule: string; coefficient: number; professeur: string | null };

export type ResultatPeriode = {
  moyennes: Record<string, MoyenneMatiere>; // par matière
  moyenne: number | null; // moyenne générale
  complete: boolean;
  rang: number | null;
  exAequo: boolean;
};

export type LigneScolaire = {
  inscriptionId: string;
  nom: string;
  matricule: string | null;
  periodes: Record<number, ResultatPeriode>;
  annuelle: { moyenne: number | null; rang: number | null; exAequo: boolean; moyennes: Record<string, number | null> };
  decision: DecisionSaisie | null; // décision de fin d'année enregistrée par le conseil de classe
};

export type StatsClasse = {
  moyenneClasse: number | null;
  plusForte: number | null;
  plusFaible: number | null;
  moyennesMatieres: Record<string, number | null>; // moyenne de la classe par matière
};

export type ResultatsScolaires = {
  decoupage: DecoupageSaisie;
  formation: { cycle: Cycle; niveau: number | null }; // pour le texte de la décision (« Passe en CM2 »)
  periodes: number[];
  matieres: MatiereBulletin[];
  lignes: LigneScolaire[];
  evaluations: Record<number, number>; // nombre d'évaluations par période
  verrouille: Record<number, boolean>; // toutes les évaluations de la période verrouillées
  stats: Record<number, StatsClasse>;
  statsAnnee: StatsClasse;
  sansPeriode: number; // évaluations créées sans période (ignorées)
};

function statistiques(moyennes: (number | null)[], parMatiere: Record<string, (number | null)[]>): StatsClasse {
  const notees = moyennes.filter((m): m is number => m !== null);
  return {
    moyenneClasse: moyennePonderee(notees.map((valeur) => ({ valeur, poids: 1 }))),
    plusForte: notees.length > 0 ? Math.max(...notees) : null,
    plusFaible: notees.length > 0 ? Math.min(...notees) : null,
    moyennesMatieres: Object.fromEntries(
      Object.entries(parMatiere).map(([id, liste]) => [id, moyennePonderee(liste.map((valeur) => ({ valeur, poids: 1 })))]),
    ),
  };
}

function classement(toutes: (number | null)[], moyenne: number | null) {
  return {
    rang: rang(toutes, moyenne),
    exAequo: moyenne !== null && toutes.filter((m) => m === moyenne).length > 1,
  };
}

export async function chargerResultatsScolaires(
  db: DbInstitut,
  sessionId: string,
  decoupage: DecoupageSaisie,
): Promise<ResultatsScolaires | null> {
  const session = await db.session.findFirst({
    where: { id: sessionId },
    select: { id: true, formationId: true, formation: { select: { cycle: true, niveau: true } } },
  });
  if (!session) return null;
  const periodes = listePeriodes(decoupage);

  const [matieres, affectations, evaluations, inscriptions] = await Promise.all([
    db.matiere.findMany({
      where: { formationId: session.formationId, active: true },
      orderBy: [{ ordre: "asc" }, { intitule: "asc" }],
      include: { enseignantHabituel: { select: { prenom: true, nom: true } } },
    }),
    db.affectation.findMany({
      where: { sessionId },
      select: { matiereId: true, enseignant: { select: { prenom: true, nom: true } } },
    }),
    db.evaluation.findMany({
      where: { sessionId },
      select: {
        matiereId: true,
        periode: true,
        poids: true,
        bareme: true,
        verrouillee: true,
        notes: { select: { inscriptionId: true, statut: true, valeur: true } },
      },
    }),
    db.inscription.findMany({
      where: { sessionId, statut: { in: ["ACTIVE", "TERMINEE"] } },
      include: { apprenant: { select: { prenom: true, nom: true, matricule: true } } },
    }),
  ]);

  // Professeur de la matière dans cette classe, sinon professeur habituel
  const colonnes: MatiereBulletin[] = matieres.map((m) => {
    const prof = affectations.find((a) => a.matiereId === m.id)?.enseignant ?? m.enseignantHabituel;
    return {
      id: m.id,
      intitule: m.intitule,
      coefficient: m.coefficient && m.coefficient > 0 ? m.coefficient : 1,
      professeur: prof ? `${prof.prenom} ${prof.nom}` : null,
    };
  });

  const lignes: LigneScolaire[] = inscriptions
    .map((i) => {
      const resultats: Record<number, ResultatPeriode> = {};
      for (const p of periodes) {
        const moyennes: Record<string, MoyenneMatiere> = {};
        for (const m of colonnes) {
          moyennes[m.id] = moyenneMatiere(
            evaluations
              .filter((e) => e.matiereId === m.id && e.periode === p)
              .map((e) => {
                const note = e.notes.find((n) => n.inscriptionId === i.id);
                return {
                  poids: e.poids,
                  bareme: e.bareme,
                  note: note ? { statut: note.statut as StatutNoteSaisie, valeur: note.valeur } : null,
                };
              }),
          );
        }
        // Une matière sans évaluation sur la période ne compte pas dans la moyenne générale
        const notees = colonnes.filter((m) => evaluations.some((e) => e.matiereId === m.id && e.periode === p));
        resultats[p] = {
          moyennes,
          moyenne: moyennePonderee(notees.map((m) => ({ valeur: moyennes[m.id].moyenne, poids: m.coefficient }))),
          complete: notees.length > 0 && notees.every((m) => moyennes[m.id].complete),
          rang: null,
          exAequo: false,
        };
      }
      return {
        inscriptionId: i.id,
        nom: `${i.apprenant.nom.toUpperCase()} ${i.apprenant.prenom}`,
        matricule: i.apprenant.matricule,
        periodes: resultats,
        annuelle: {
          moyenne: moyenneAnnuelle(periodes.map((p) => resultats[p].moyenne)),
          rang: null,
          exAequo: false,
          moyennes: Object.fromEntries(
            colonnes.map((m) => [m.id, moyenneAnnuelle(periodes.map((p) => resultats[p].moyennes[m.id].moyenne))]),
          ),
        },
        decision: i.decisionFinAnnee,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  // Rangs (ex aequo : même rang) et statistiques de la classe
  const stats: Record<number, StatsClasse> = {};
  const parMatiere = (lire: (l: LigneScolaire, id: string) => number | null) =>
    Object.fromEntries(colonnes.map((m) => [m.id, lignes.map((l) => lire(l, m.id))]));
  for (const p of periodes) {
    const toutes = lignes.map((l) => l.periodes[p].moyenne);
    for (const l of lignes) Object.assign(l.periodes[p], classement(toutes, l.periodes[p].moyenne));
    stats[p] = statistiques(toutes, parMatiere((l, id) => l.periodes[p].moyennes[id].moyenne));
  }
  const annuelles = lignes.map((l) => l.annuelle.moyenne);
  for (const l of lignes) Object.assign(l.annuelle, classement(annuelles, l.annuelle.moyenne));

  return {
    decoupage,
    formation: session.formation,
    periodes,
    matieres: colonnes,
    lignes,
    evaluations: Object.fromEntries(periodes.map((p) => [p, evaluations.filter((e) => e.periode === p).length])),
    verrouille: Object.fromEntries(
      periodes.map((p) => {
        const liste = evaluations.filter((e) => e.periode === p);
        return [p, liste.length > 0 && liste.every((e) => e.verrouillee)];
      }),
    ),
    stats,
    statsAnnee: statistiques(annuelles, parMatiere((l, id) => l.annuelle.moyennes[id])),
    sansPeriode: evaluations.filter((e) => e.periode === null).length,
  };
}

// ─── Bulletins d'une période ───────────────────────

export type EnTeteBulletin = {
  formation: string;
  cycle: string; // « Élémentaire »
  niveau: string | null; // « CM1 »
  classe: string; // « CM1 A »
  annee: string | null; // « 2026-2027 »
  professeurPrincipal: string | null;
};

export type Bulletin = {
  inscriptionId: string;
  eleve: {
    nom: string;
    matricule: string | null;
    sexe: "F" | "M" | null;
    dateNaissance: Date | null;
    lieuNaissance: string | null;
  };
  ligne: LigneScolaire;
  appreciations: Record<string, string>; // par matière
  conseil: { appreciation: string | null; distinction: DistinctionSaisie | null };
  absences: number; // depuis la rentrée
  effectif: number;
};

// Bulletins d'une classe pour une période (ou d'un seul élève si inscriptionId est fourni)
export async function chargerBulletins(
  db: DbInstitut,
  sessionId: string,
  decoupage: DecoupageSaisie,
  periode: number,
  inscriptionId?: string,
) {
  const [resultats, session, inscriptions, appreciations, conseils, absences] = await Promise.all([
    chargerResultatsScolaires(db, sessionId, decoupage),
    db.session.findFirst({
      where: { id: sessionId },
      include: {
        formation: { select: { intitule: true, cycle: true, niveau: true } },
        anneeAcademique: { select: { libelle: true } },
        formateur: { select: { utilisateur: { select: { nom: true } } } },
      },
    }),
    db.inscription.findMany({
      where: { sessionId, ...(inscriptionId ? { id: inscriptionId } : {}) },
      include: { apprenant: { select: { sexe: true, dateNaissance: true, lieuNaissance: true } } },
    }),
    db.appreciationMatiere.findMany({
      where: { periode, inscription: { sessionId }, ...(inscriptionId ? { inscriptionId } : {}) },
      select: { inscriptionId: true, matiereId: true, texte: true },
    }),
    db.conseilClasse.findMany({
      where: { periode, inscription: { sessionId }, ...(inscriptionId ? { inscriptionId } : {}) },
      select: { inscriptionId: true, appreciation: true, distinction: true },
    }),
    db.presence.groupBy({
      by: ["inscriptionId"],
      where: { statut: "ABSENT", inscription: { sessionId } },
      _count: true,
    }),
  ]);
  if (!resultats || !session || !resultats.periodes.includes(periode)) return null;

  const enTete: EnTeteBulletin = {
    formation: session.formation.intitule,
    cycle: CYCLES[session.formation.cycle].label,
    niveau: codeNiveau(session.formation.cycle, session.formation.niveau) || null,
    classe: session.nom,
    annee: session.anneeAcademique?.libelle ?? null,
    professeurPrincipal: session.formateur?.utilisateur.nom ?? null,
  };

  const bulletins: Bulletin[] = resultats.lignes
    .filter((l) => !inscriptionId || l.inscriptionId === inscriptionId)
    .map((l) => {
      const apprenant = inscriptions.find((i) => i.id === l.inscriptionId)?.apprenant;
      const conseil = conseils.find((c) => c.inscriptionId === l.inscriptionId);
      return {
        inscriptionId: l.inscriptionId,
        eleve: {
          nom: l.nom,
          matricule: l.matricule,
          sexe: apprenant?.sexe ?? null,
          dateNaissance: apprenant?.dateNaissance ?? null,
          lieuNaissance: apprenant?.lieuNaissance ?? null,
        },
        ligne: l,
        appreciations: Object.fromEntries(
          appreciations.filter((a) => a.inscriptionId === l.inscriptionId).map((a) => [a.matiereId, a.texte]),
        ),
        conseil: { appreciation: conseil?.appreciation ?? null, distinction: conseil?.distinction ?? null },
        absences: absences.find((a) => a.inscriptionId === l.inscriptionId)?._count ?? 0,
        effectif: resultats.lignes.length,
      };
    });

  return { resultats, enTete, bulletins };
}
