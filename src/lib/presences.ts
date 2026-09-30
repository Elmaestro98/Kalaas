import type { Jour } from "@/lib/emploi-du-temps";

export type StatutPresence = "PRESENT" | "ABSENT" | "RETARD" | "EXCUSE";

export const STATUTS_PRESENCE: {
  valeur: StatutPresence;
  label: string;
  court: string;
  actif: string; // classes du bouton sélectionné
}[] = [
  { valeur: "PRESENT", label: "Présent", court: "P", actif: "bg-success text-white border-success" },
  { valeur: "ABSENT", label: "Absent", court: "A", actif: "bg-danger text-white border-danger" },
  { valeur: "RETARD", label: "En retard", court: "R", actif: "bg-warning text-white border-warning" },
  { valeur: "EXCUSE", label: "Excusé", court: "E", actif: "bg-info text-white border-info" },
];

export type Compteurs = Record<StatutPresence, number>;

export function compter(statuts: StatutPresence[]): Compteurs {
  const c: Compteurs = { PRESENT: 0, ABSENT: 0, RETARD: 0, EXCUSE: 0 };
  for (const s of statuts) c[s] += 1;
  return c;
}

// Assiduité = (présents + retards) / (séances − absences excusées). null si aucune séance.
export function tauxAssiduite(c: Compteurs): number | null {
  const base = c.PRESENT + c.ABSENT + c.RETARD;
  if (base === 0) {
    return null;
  }
  return Math.round(((c.PRESENT + c.RETARD) / base) * 100);
}

export function classeTaux(taux: number | null): string {
  if (taux === null) return "text-ink-muted";
  if (taux >= 90) return "text-success";
  if (taux >= 75) return "text-warning";
  return "text-danger";
}

const JOURS_JS: Jour[] = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

// « 2026-09-30 » → date UTC à minuit, ou null si invalide
export function lireDate(saisie: string | undefined): Date | null {
  if (!saisie || !/^\d{4}-\d{2}-\d{2}$/.test(saisie)) {
    return null;
  }
  const d = new Date(`${saisie}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function jourDeDate(d: Date): Jour {
  return JOURS_JS[d.getUTCDay()];
}

// Un formateur peut compléter un appel oublié jusqu'à 7 jours en arrière
export const JOURS_RATTRAPAGE_FORMATEUR = 7;
