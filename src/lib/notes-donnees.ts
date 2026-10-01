import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { dateDuJour } from "@/lib/echeancier";
import { estLmd } from "@/lib/lmd";
import {
  moyenneMatiere,
  resultatSemestre,
  type MoyenneMatiere,
  type ResultatSemestre,
  type StatutNoteSaisie,
  type UEPourCalcul,
} from "@/lib/notes";

type Membre = { id: string; role: string };

// Fiche professeur du membre connecté (null pour la direction ou un compte non relié)
export async function ficheDuMembre(db: DbInstitut, membre: Membre) {
  return membre.role === "FORMATEUR" ? db.enseignant.findFirst({ where: { membreId: membre.id } }) : null;
}

// Un professeur note une matière d'une classe s'il y est affecté ou s'il y donne des cours
export async function peutNoter(db: DbInstitut, membre: Membre, sessionId: string, matiereId: string): Promise<boolean> {
  if (membre.role === "DIRECTEUR") return true;
  if (membre.role !== "FORMATEUR") return false;
  const fiche = await ficheDuMembre(db, membre);
  if (!fiche) return false;
  const [affectation, cours] = await Promise.all([
    db.affectation.findFirst({ where: { sessionId, matiereId, enseignantId: fiche.id }, select: { id: true } }),
    db.creneau.findFirst({ where: { sessionId, matiereId, enseignantId: fiche.id }, select: { id: true } }),
  ]);
  return Boolean(affectation || cours);
}

// Matières qu'un professeur peut noter dans une classe (toutes pour la direction)
export async function matieresNotables(db: DbInstitut, membre: Membre, sessionId: string): Promise<Set<string> | "TOUTES"> {
  if (membre.role === "DIRECTEUR") return "TOUTES";
  const fiche = await ficheDuMembre(db, membre);
  if (!fiche) return new Set();
  const [affectations, cours] = await Promise.all([
    db.affectation.findMany({ where: { sessionId, enseignantId: fiche.id }, select: { matiereId: true } }),
    db.creneau.findMany({ where: { sessionId, enseignantId: fiche.id }, select: { matiereId: true } }),
  ]);
  return new Set([...affectations, ...cours].map((x) => x.matiereId).filter((id): id is string => Boolean(id)));
}

// Classes en cours visibles dans « Notes » (un professeur : celles où il enseigne)
export async function classesPourNotes(db: DbInstitut, membre: Membre) {
  const fiche = await ficheDuMembre(db, membre);
  if (membre.role === "FORMATEUR" && !fiche) return [];
  return db.session.findMany({
    where: {
      dateFin: { gte: new Date(dateDuJour().getTime() - 60 * 86_400_000) }, // + 2 mois pour finir de noter
      ...(fiche
        ? { OR: [{ affectations: { some: { enseignantId: fiche.id } } }, { creneaux: { some: { enseignantId: fiche.id } } }] }
        : {}),
    },
    orderBy: { dateDebut: "asc" },
    include: { formation: { select: { id: true, intitule: true, cycle: true } }, anneeAcademique: { select: { libelle: true } } },
  });
}

// ─── Résultats d'une classe ────────────────────────

export type ColonneMatiere = { id: string; intitule: string; coefficient: number | null };
export type GroupeUE = { id: string; intitule: string; credits: number | null; matieres: ColonneMatiere[] };
export type BlocSemestre = { semestre: number | null; ues: GroupeUE[] };

export type LigneResultat = {
  inscriptionId: string;
  nom: string;
  matricule: string | null;
  moyennes: Record<string, MoyenneMatiere>; // par matière
  semestres: Record<string, ResultatSemestre>; // par semestre (clé « S1 », « S? »)
};

export type ResultatsClasse = {
  lmd: boolean;
  blocs: BlocSemestre[];
  lignes: LigneResultat[];
  nbEvaluations: number;
};

export const cleSemestre = (s: number | null) => (s ? `S${s}` : "S?");

export async function chargerResultatsClasse(db: DbInstitut, sessionId: string): Promise<ResultatsClasse | null> {
  const session = await db.session.findFirst({
    where: { id: sessionId },
    include: { formation: { select: { id: true, cycle: true } } },
  });
  if (!session) return null;
  const lmd = estLmd(session.formation.cycle);

  const [matieres, ues, evaluations, inscriptions] = await Promise.all([
    db.matiere.findMany({
      where: { formationId: session.formation.id, active: true },
      orderBy: [{ ordre: "asc" }, { intitule: "asc" }],
    }),
    db.uniteEnseignement.findMany({
      where: { formationId: session.formation.id, active: true },
      orderBy: [{ semestre: "asc" }, { ordre: "asc" }, { intitule: "asc" }],
    }),
    db.evaluation.findMany({
      where: { sessionId },
      select: { matiereId: true, poids: true, bareme: true, notes: { select: { inscriptionId: true, statut: true, valeur: true } } },
    }),
    db.inscription.findMany({
      where: { sessionId, statut: { in: ["ACTIVE", "TERMINEE"] } },
      include: { apprenant: { select: { prenom: true, nom: true, matricule: true } } },
    }),
  ]);

  // Structure : formation courte → une « UE » unique (moyenne générale pondérée par les coefficients)
  let blocs: BlocSemestre[];
  const colonne = (m: (typeof matieres)[number]): ColonneMatiere => ({ id: m.id, intitule: m.intitule, coefficient: m.coefficient });
  if (!lmd) {
    blocs = [{ semestre: null, ues: [{ id: "general", intitule: "Moyenne générale", credits: null, matieres: matieres.map(colonne) }] }];
  } else {
    const semestreDe = (m: (typeof matieres)[number]) => ues.find((u) => u.id === m.ueId)?.semestre ?? m.semestre ?? null;
    const semestres = [...new Set(matieres.map(semestreDe))].sort((a, b) => (a ?? 99) - (b ?? 99));
    blocs = semestres.map((s) => ({
      semestre: s,
      ues: [
        ...ues
          .filter((u) => u.semestre === s)
          .map((u) => ({
            id: u.id,
            intitule: u.code ? `${u.code} · ${u.intitule}` : u.intitule,
            credits: u.credits,
            matieres: matieres.filter((m) => m.ueId === u.id).map(colonne),
          }))
          .filter((u) => u.matieres.length > 0),
        // Matière sans UE : elle compte comme une UE à part, avec ses propres crédits
        ...matieres
          .filter((m) => semestreDe(m) === s && !ues.some((u) => u.id === m.ueId))
          .map((m) => ({ id: m.id, intitule: m.intitule, credits: m.credits, matieres: [colonne(m)] })),
      ],
    }));
  }

  const lignes: LigneResultat[] = inscriptions
    .map((i) => {
      const moyennes: Record<string, MoyenneMatiere> = {};
      for (const m of matieres) {
        moyennes[m.id] = moyenneMatiere(
          evaluations
            .filter((e) => e.matiereId === m.id)
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
      const semestres: Record<string, ResultatSemestre> = {};
      for (const b of blocs) {
        const pourCalcul: UEPourCalcul[] = b.ues.map((u) => ({
          id: u.id,
          intitule: u.intitule,
          credits: u.credits,
          matieres: u.matieres.map((m) => ({ ...m, moyenne: moyennes[m.id] })),
        }));
        semestres[cleSemestre(b.semestre)] = resultatSemestre(pourCalcul);
      }
      return {
        inscriptionId: i.id,
        nom: `${i.apprenant.nom.toUpperCase()} ${i.apprenant.prenom}`,
        matricule: i.apprenant.matricule,
        moyennes,
        semestres,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return { lmd, blocs, lignes, nbEvaluations: evaluations.length };
}
