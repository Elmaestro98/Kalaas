import type { TonBadge } from "@/components/ui/badge";

export type Cycle = "FORMATION_COURTE" | "LICENCE" | "MASTER" | "DOCTORAT";

type InfoCycle = {
  label: string;
  lettre: string;
  nbNiveaux: number;
  ton: TonBadge;
};

export const CYCLES: Record<Cycle, InfoCycle> = {
  FORMATION_COURTE: { label: "Formation courte", lettre: "", nbNiveaux: 0, ton: "neutral" },
  LICENCE: { label: "Licence", lettre: "L", nbNiveaux: 3, ton: "info" },
  MASTER: { label: "Master", lettre: "M", nbNiveaux: 2, ton: "gold" },
  DOCTORAT: { label: "Doctorat", lettre: "D", nbNiveaux: 3, ton: "success" },
};

export const ORDRE_CYCLES: Cycle[] = ["LICENCE", "MASTER", "DOCTORAT", "FORMATION_COURTE"];

export function estLmd(cycle: Cycle): boolean {
  return cycle !== "FORMATION_COURTE";
}

// Ex. (LICENCE, 2) → « L2 »
export function codeNiveau(cycle: Cycle, niveau: number | null): string {
  if (!estLmd(cycle) || !niveau) {
    return "";
  }
  return `${CYCLES[cycle].lettre}${niveau}`;
}

// Ex. (LICENCE, « Informatique de gestion », 2) → « Licence Informatique de gestion — L2 »
export function intituleLmd(cycle: Cycle, filiere: string, niveau: number): string {
  return `${CYCLES[cycle].label} ${filiere.trim()} — ${codeNiveau(cycle, niveau)}`;
}

// Niveau suivant dans le même cycle (L1 → L2), ou null en fin de cycle (L3).
export function niveauSuivant(cycle: Cycle, niveau: number | null): number | null {
  if (!estLmd(cycle) || !niveau || niveau >= CYCLES[cycle].nbNiveaux) {
    return null;
  }
  return niveau + 1;
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
