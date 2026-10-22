// Bulletins scolaires (écoles : préscolaire → lycée), règles pures utilisables partout.
// Règles retenues :
//  • moyenne d'une matière sur la période = évaluations de la période pondérées par leur poids
//  • moyenne générale de la période        = moyennes des matières pondérées par les coefficients
//  • moyenne annuelle                      = moyenne des périodes déjà notées (même poids)
//  • distinctions proposées d'après la moyenne, modifiables par le conseil de classe
//  • décision de fin d'année proposée d'après la moyenne annuelle (passage à 10/20)

import { SEUIL_VALIDATION, moyennePonderee } from "@/lib/notes";
import { codeNiveau, niveauSuivant, type Cycle } from "@/lib/lmd";
import { accord } from "@/lib/documents";

export type DecoupageSaisie = "TRIMESTRES" | "SEMESTRES";
export type DistinctionSaisie = "FELICITATIONS" | "ENCOURAGEMENTS" | "TABLEAU_HONNEUR" | "AVERTISSEMENT" | "BLAME";

export const DECOUPAGES: Record<DecoupageSaisie, { label: string; nb: number; nom: string }> = {
  TRIMESTRES: { label: "Trimestres (3 bulletins par an)", nb: 3, nom: "trimestre" },
  SEMESTRES: { label: "Semestres (2 bulletins par an)", nb: 2, nom: "semestre" },
};

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
export function proposerDistinction(moyenne: number | null): DistinctionSaisie | null {
  if (moyenne === null) return null;
  if (moyenne >= 16) return "FELICITATIONS";
  if (moyenne >= 14) return "ENCOURAGEMENTS";
  if (moyenne >= 12) return "TABLEAU_HONNEUR";
  if (moyenne < 6) return "BLAME";
  if (moyenne < 8) return "AVERTISSEMENT";
  return null;
}

// Appréciation suggérée d'après une moyenne (aide à la saisie, jamais imposée)
export function appreciationSuggeree(moyenne: number | null): string {
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
export function proposerDecision(moyenneAnnuelle: number | null): DecisionSaisie | null {
  if (moyenneAnnuelle === null) return null;
  return moyenneAnnuelle >= SEUIL_VALIDATION ? "PASSAGE" : "REDOUBLEMENT";
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
