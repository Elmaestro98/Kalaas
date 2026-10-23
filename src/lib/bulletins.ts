// Bulletins scolaires (écoles : préscolaire → lycée), règles pures utilisables partout.
// Règles retenues :
//  • moyenne d'une matière sur la période = évaluations de la période pondérées par leur poids
//  • moyenne générale de la période        = moyennes des matières pondérées par les coefficients
//  • moyenne annuelle                      = moyenne des périodes déjà notées (même poids)
//  • distinctions proposées d'après la moyenne, modifiables par le conseil de classe
//  • décision de fin d'année proposée d'après la moyenne annuelle (passage à 10/20)
//  • élémentaire : moyennes sur 10 (passage à 5/10) ; préscolaire : niveaux d'acquisition, sans note

import { SEUIL_VALIDATION, moyennePonderee } from "@/lib/notes";
import { codeNiveau, niveauSuivant, type Cycle } from "@/lib/lmd";
import { accord } from "@/lib/documents";

export type DecoupageSaisie = "TRIMESTRES" | "SEMESTRES";
export type DistinctionSaisie = "FELICITATIONS" | "ENCOURAGEMENTS" | "TABLEAU_HONNEUR" | "AVERTISSEMENT" | "BLAME";

export const DECOUPAGES: Record<DecoupageSaisie, { label: string; nb: number; nom: string }> = {
  TRIMESTRES: { label: "Trimestres (3 bulletins par an)", nb: 3, nom: "trimestre" },
  SEMESTRES: { label: "Semestres (2 bulletins par an)", nb: 2, nom: "semestre" },
};

// ─── Échelle des notes et préscolaire ──────────────

// Moyennes sur 10 à l'élémentaire (CI → CM2), sur 20 au moyen et au secondaire
export function noteSur(cycle: Cycle): number {
  return cycle === "ELEMENTAIRE" ? 10 : 20;
}

// Moyenne ramenée sur 20 : les seuils (distinctions, passage) sont exprimés sur 20
function sur20(moyenne: number | null, sur: number): number | null {
  return moyenne === null ? null : (moyenne * 20) / sur;
}

// Moyenne en dessous de laquelle la note est affichée en rouge : 10/20, 5/10
export function seuilReussite(sur: number): number {
  return (SEUIL_VALIDATION * sur) / 20;
}

// Préscolaire (PS, MS, GS) : pas de notes, chaque compétence est évaluée par un niveau d'acquisition
export function parCompetences(cycle: Cycle): boolean {
  return cycle === "PRESCOLAIRE";
}

export type NiveauSaisie = "ACQUIS" | "EN_COURS" | "NON_ACQUIS";

export const NIVEAUX_ACQUISITION: { valeur: NiveauSaisie; label: string; court: string; suggestion: string }[] = [
  { valeur: "ACQUIS", label: "Acquis", court: "A", suggestion: "Compétence acquise, bravo" },
  { valeur: "EN_COURS", label: "En cours d'acquisition", court: "EC", suggestion: "En bonne voie, poursuivre les efforts" },
  { valeur: "NON_ACQUIS", label: "Non acquis", court: "NA", suggestion: "Doit encore s'exercer" },
];

export const NIVEAU = Object.fromEntries(NIVEAUX_ACQUISITION.map((n) => [n.valeur, n])) as Record<
  NiveauSaisie,
  (typeof NIVEAUX_ACQUISITION)[number]
>;

// Résumé des niveaux d'un élève : « 5 A · 2 EC · 1 NA » (null si rien n'est évalué)
export function bilanCompetences(niveaux: NiveauSaisie[]): string | null {
  const parties = NIVEAUX_ACQUISITION.map((n) => [niveaux.filter((v) => v === n.valeur).length, n.court] as const)
    .filter(([nb]) => nb > 0)
    .map(([nb, court]) => `${nb} ${court}`);
  return parties.length > 0 ? parties.join(" · ") : null;
}

export function nbPeriodes(decoupage: DecoupageSaisie): number {
  return DECOUPAGES[decoupage].nb;
}

// 1 → « 1er trimestre », 2 → « 2e semestre »
export function libellePeriode(decoupage: DecoupageSaisie, periode: number): string {
  return `${periode}${periode === 1 ? "er" : "e"} ${DECOUPAGES[decoupage].nom}`;
}

export function periodes(decoupage: DecoupageSaisie): number[] {
  return Array.from({ length: nbPeriodes(decoupage) }, (_, i) => i + 1);
}

// Ordre d'affichage : du meilleur au plus sévère
export const DISTINCTIONS: { valeur: DistinctionSaisie; label: string; positive: boolean }[] = [
  { valeur: "FELICITATIONS", label: "Félicitations", positive: true },
  { valeur: "ENCOURAGEMENTS", label: "Encouragements", positive: true },
  { valeur: "TABLEAU_HONNEUR", label: "Tableau d'honneur", positive: true },
  { valeur: "AVERTISSEMENT", label: "Avertissement", positive: false },
  { valeur: "BLAME", label: "Blâme", positive: false },
];

export const LABEL_DISTINCTION = Object.fromEntries(DISTINCTIONS.map((d) => [d.valeur, d.label])) as Record<
  DistinctionSaisie,
  string
>;

// Proposition automatique (le conseil de classe garde le dernier mot)
export function proposerDistinction(moyenneObtenue: number | null, sur = 20): DistinctionSaisie | null {
  const moyenne = sur20(moyenneObtenue, sur);
  if (moyenne === null) return null;
  if (moyenne >= 16) return "FELICITATIONS";
  if (moyenne >= 14) return "ENCOURAGEMENTS";
  if (moyenne >= 12) return "TABLEAU_HONNEUR";
  if (moyenne < 6) return "BLAME";
  if (moyenne < 8) return "AVERTISSEMENT";
  return null;
}

// Appréciation suggérée d'après une moyenne (aide à la saisie, jamais imposée)
export function appreciationSuggeree(moyenneObtenue: number | null, sur = 20): string {
  const moyenne = sur20(moyenneObtenue, sur);
  if (moyenne === null) return "";
  if (moyenne >= 16) return "Excellent travail";
  if (moyenne >= 14) return "Très bon travail";
  if (moyenne >= 12) return "Bon travail";
  if (moyenne >= 10) return "Assez bien, peut mieux faire";
  if (moyenne >= 8) return "Travail insuffisant";
  return "Travail très insuffisant, des efforts s'imposent";
}

export function moyenneAnnuelle(moyennesPeriodes: (number | null)[]): number | null {
  return moyennePonderee(moyennesPeriodes.map((valeur) => ({ valeur, poids: 1 })));
}

// 1 → « 1er », 3 → « 3e » (ex aequo : « 3e ex »)
export function formatRang(rang: number | null, exAequo = false): string {
  if (rang === null) return "—";
  return `${rang}${rang === 1 ? "er" : "e"}${exAequo ? " ex" : ""}`;
}

export const LONGUEUR_APPRECIATION = 120;

// ─── Décision de fin d'année ───────────────────────

export type DecisionSaisie = "PASSAGE" | "REDOUBLEMENT";

export const DECISIONS_FIN_ANNEE: { valeur: DecisionSaisie; label: string }[] = [
  { valeur: "PASSAGE", label: "Passage" },
  { valeur: "REDOUBLEMENT", label: "Redoublement" },
];

// Proposition automatique (le conseil de classe garde le dernier mot)
export function proposerDecision(moyenneAnnuelle: number | null, sur = 20): DecisionSaisie | null {
  const moyenne = sur20(moyenneAnnuelle, sur);
  if (moyenne === null) return null;
  return moyenne >= SEUIL_VALIDATION ? "PASSAGE" : "REDOUBLEMENT";
}

// Texte imprimé : « Passe en CM2 », « Passe en 6e », « Redouble le CM1 » ; « Admis(e) » après la Terminale
export function texteDecision(
  decision: DecisionSaisie,
  cycle: Cycle,
  niveau: number | null,
  sexe: "F" | "M" | null,
): string {
  if (decision === "REDOUBLEMENT") {
    const actuel = codeNiveau(cycle, niveau);
    // « la 6e », « la Tle », « la PS » ; « le CM1 », « le CI »
    return actuel ? `Redouble ${/^(\d|PS|MS|GS|Tle)/.test(actuel) ? "la" : "le"} ${actuel}` : "Redouble";
  }
  const suivant = niveauSuivant(cycle, niveau);
  return suivant ? `Passe en ${codeNiveau(suivant.cycle, suivant.niveau)}` : accord(sexe, "Admis", "Admise");
}

// ─── Dates des périodes ────────────────────────────

export type DatesPeriode = { numero: number; dateDebut: string; dateFin: string }; // AAAA-MM-JJ

const JOUR_MS = 86_400_000;
const jour = (d: Date) => d.toISOString().slice(0, 10);

// Proposition : l'année scolaire découpée en périodes de même durée
export function proposerDatesPeriodes(debutAnnee: Date, finAnnee: Date, nb: number): DatesPeriode[] {
  const total = Math.round((finAnnee.getTime() - debutAnnee.getTime()) / JOUR_MS) + 1;
  return Array.from({ length: nb }, (_, i) => {
    const debut = new Date(debutAnnee.getTime() + Math.round((total * i) / nb) * JOUR_MS);
    const fin = new Date(debutAnnee.getTime() + (Math.round((total * (i + 1)) / nb) - 1) * JOUR_MS);
    return { numero: i + 1, dateDebut: jour(debut), dateFin: jour(fin) };
  });
}

// Erreur de saisie, ou null si les dates sont cohérentes (dans l'année, dans l'ordre, sans chevauchement)
export function verifierDatesPeriodes(dates: DatesPeriode[], debutAnnee: string, finAnnee: string): string | null {
  for (const d of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dateDebut) || !/^\d{4}-\d{2}-\d{2}$/.test(d.dateFin)) {
      return `Dates manquantes pour la période ${d.numero}.`;
    }
    if (d.dateFin < d.dateDebut) return `Période ${d.numero} : la fin est avant le début.`;
    if (d.dateDebut < debutAnnee || d.dateFin > finAnnee) {
      return `Période ${d.numero} : les dates doivent rester dans l'année scolaire.`;
    }
  }
  for (let i = 1; i < dates.length; i++) {
    if (dates[i].dateDebut <= dates[i - 1].dateFin) {
      return `La période ${dates[i].numero} doit commencer après la fin de la période ${dates[i - 1].numero}.`;
    }
  }
  return null;
}

// Période qui contient la date (AAAA-MM-JJ) ; avant la 1re → 1, après la dernière → la dernière
export function periodeDeLaDate(dates: DatesPeriode[], date: string): number | null {
  if (dates.length === 0) return null;
  const tri = [...dates].sort((a, b) => a.numero - b.numero);
  const dedans = tri.find((d) => d.dateDebut <= date && date <= d.dateFin);
  if (dedans) return dedans.numero;
  // Entre deux périodes (vacances) : la période qui vient de se terminer
  const passees = tri.filter((d) => d.dateFin < date);
  return passees.length > 0 ? passees[passees.length - 1].numero : tri[0].numero;
}
