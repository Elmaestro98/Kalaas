// Paie des vacataires : règles de calcul pures (sans base de données)
import type { TonBadge } from "@/components/ui/badge";

export type StatutVacationSaisie = "VALIDEE" | "PAYEE";

export const STATUT_VACATION: Record<StatutVacationSaisie, { label: string; ton: TonBadge }> = {
  VALIDEE: { label: "Validée, à payer", ton: "warning" },
  PAYEE: { label: "Payée", ton: "success" },
};

// Une ligne du détail figé sur le bulletin
export type LigneDetailVacation = { classe: string; matiere: string; minutes: number };

// VAC-2026-00001
export function formaterNumeroVacation(annee: number, numero: number): string {
  return `VAC-${annee}-${String(numero).padStart(5, "0")}`;
}

// Montant brut en FCFA : minutes × tarif horaire ÷ 60, arrondi au franc
export function calculerBrut(minutes: number, tarifHoraire: number): number {
  return Math.round((minutes * tarifHoraire) / 60);
}

// 750 minutes → « 12 h 30 », 600 → « 10 h »
export function formatHeures(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

// « -20 000 », « 5000 », « +5 000 » → nombre entier ; vide → 0 ; invalide → null
export function lireAjustement(saisie: string): number | null {
  const texte = saisie.replace(/[\s\u00A0\u202F]/g, "");
  if (texte === "") return 0;
  if (!/^[+-]?\d{1,9}$/.test(texte)) return null;
  return Number(texte);
}

// « 2026-10 » valide ?
export function estMois(cle: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(cle);
}
