import type { TonBadge } from "@/components/ui/badge";

export type Cycle =
  | "FORMATION_COURTE"
  | "LICENCE"
  | "MASTER"
  | "DOCTORAT"
  | "PRESCOLAIRE"
  | "ELEMENTAIRE"
  | "MOYEN"
  | "SECONDAIRE";

// Trois familles : formation courte, enseignement supérieur LMD, école (maternelle → lycée)
export type Famille = "COURTE" | "LMD" | "SCOLAIRE";

type InfoCycle = {
  label: string;
  famille: Famille;
  niveaux: string[]; // noms des niveaux, du premier au dernier (vide pour une formation courte)
  ton: TonBadge;
};

export const CYCLES: Record<Cycle, InfoCycle> = {
  FORMATION_COURTE: { label: "Formation courte", famille: "COURTE", niveaux: [], ton: "neutral" },
  LICENCE: { label: "Licence", famille: "LMD", niveaux: ["L1", "L2", "L3"], ton: "info" },
  MASTER: { label: "Master", famille: "LMD", niveaux: ["M1", "M2"], ton: "gold" },
  DOCTORAT: { label: "Doctorat", famille: "LMD", niveaux: ["D1", "D2", "D3"], ton: "success" },
  PRESCOLAIRE: { label: "Préscolaire", famille: "SCOLAIRE", niveaux: ["PS", "MS", "GS"], ton: "neutral" },
  ELEMENTAIRE: {
    label: "Élémentaire",
    famille: "SCOLAIRE",
    niveaux: ["CI", "CP", "CE1", "CE2", "CM1", "CM2"],
    ton: "info",
  },
  MOYEN: { label: "Moyen", famille: "SCOLAIRE", niveaux: ["6e", "5e", "4e", "3e"], ton: "gold" },
  SECONDAIRE: { label: "Secondaire", famille: "SCOLAIRE", niveaux: ["2nde", "1re", "Tle"], ton: "success" },
};

export const ORDRE_CYCLES: Cycle[] = [
  "PRESCOLAIRE",
  "ELEMENTAIRE",
  "MOYEN",
  "SECONDAIRE",
  "LICENCE",
  "MASTER",
  "DOCTORAT",
  "FORMATION_COURTE",
];

// Licence, Master, Doctorat : unités d'enseignement, crédits, semestres
export function estLmd(cycle: Cycle): boolean {
  return CYCLES[cycle].famille === "LMD";
}

// Maternelle → lycée
export function estScolaire(cycle: Cycle): boolean {
  return CYCLES[cycle].famille === "SCOLAIRE";
}

// Cycle organisé en niveaux sur une année scolaire ou académique (LMD et écoles)
export function aDesNiveaux(cycle: Cycle): boolean {
  return CYCLES[cycle].famille !== "COURTE";
}

// Ex. (LICENCE, 2) → « L2 » ; (ELEMENTAIRE, 5) → « CM1 »
export function codeNiveau(cycle: Cycle, niveau: number | null): string {
  if (!niveau) {
    return "";
  }
  return CYCLES[cycle].niveaux[niveau - 1] ?? "";
}

// Ex. « Licence Informatique de gestion — L2 » ; à l'école : « CM1 », « Tle S »
export function intituleNiveau(cycle: Cycle, filiere: string, niveau: number): string {
  const code = codeNiveau(cycle, niveau);
  if (estScolaire(cycle)) {
    return filiere.trim() ? `${code} ${filiere.trim()}` : code;
  }
  return `${CYCLES[cycle].label} ${filiere.trim()} — ${code}`;
}

// À l'école, la fin d'un cycle mène au premier niveau du suivant : GS → CI, CM2 → 6e, 3e → 2nde
const CYCLE_SUIVANT: Partial<Record<Cycle, Cycle>> = {
  PRESCOLAIRE: "ELEMENTAIRE",
  ELEMENTAIRE: "MOYEN",
  MOYEN: "SECONDAIRE",
};

// Niveau de l'année suivante : L1 → L2, CM1 → CM2, CM2 → 6e.
// null en fin de parcours (L3, M2, Tle) : l'étudiant change de cycle → nouvelle inscription.
export function niveauSuivant(cycle: Cycle, niveau: number | null): { cycle: Cycle; niveau: number } | null {
  if (!aDesNiveaux(cycle) || !niveau) {
    return null;
  }
  if (niveau < CYCLES[cycle].niveaux.length) {
    return { cycle, niveau: niveau + 1 };
  }
  const suivant = CYCLE_SUIVANT[cycle];
  return suivant ? { cycle: suivant, niveau: 1 } : null;
}

// Ex. 2026 → « 2026-2027 »
export function libelleAnnee(anneeDebut: number): string {
  return `${anneeDebut}-${anneeDebut + 1}`;
}

const MOTS_IGNORES = new Set(["de", "du", "des", "d", "la", "le", "les", "l", "et", "en", "a", "au", "aux"]);

// Préfixe de matricule tiré du nom : « Institut Teranga Formation » → « ITF »
export function prefixeParDefaut(nom: string): string {
  const initiales = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((mot) => mot && !MOTS_IGNORES.has(mot.toLowerCase()))
    .map((mot) => mot[0].toUpperCase())
    .join("")
    .slice(0, 4);
  return initiales.length >= 2 ? initiales : "KLS";
}

export function formaterMatricule(prefixe: string, annee: number, numero: number): string {
  return `${prefixe}-${annee}-${String(numero).padStart(4, "0")}`;
}

export const TYPE_INSCRIPTION: Record<
  "NOUVELLE" | "REINSCRIPTION" | "REDOUBLEMENT",
  { label: string; ton: TonBadge }
> = {
  NOUVELLE: { label: "Nouvelle inscription", ton: "neutral" },
  REINSCRIPTION: { label: "Réinscription", ton: "info" },
  REDOUBLEMENT: { label: "Redoublement", ton: "warning" },
};
