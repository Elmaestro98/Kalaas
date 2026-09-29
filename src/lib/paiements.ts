import type { TonBadge } from "@/components/ui/badge";

export type ModePaiementSaisie = "ESPECES" | "WAVE" | "ORANGE_MONEY" | "VIREMENT";

export const MODES_PAIEMENT: { valeur: ModePaiementSaisie; label: string }[] = [
  { valeur: "ESPECES", label: "Espèces" },
  { valeur: "WAVE", label: "Wave" },
  { valeur: "ORANGE_MONEY", label: "Orange Money" },
  { valeur: "VIREMENT", label: "Virement" },
];

export const LABEL_MODE: Record<ModePaiementSaisie, string> = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  VIREMENT: "Virement",
};

export const TON_MODE: Record<ModePaiementSaisie, TonBadge> = {
  ESPECES: "neutral",
  WAVE: "info",
  ORANGE_MONEY: "warning",
  VIREMENT: "gold",
};

// Wave, Orange Money et virement exigent la référence de la transaction
export function referenceObligatoire(mode: ModePaiementSaisie): boolean {
  return mode !== "ESPECES";
}

export type EcheanceOuverte = { id: string; reste: number };
export type Affectation = { echeanceId: string; montant: number };

// Répartit un paiement sur les échéances, la plus ancienne d'abord.
// Les échéances doivent déjà être triées (date limite, puis ordre).
export function repartirPaiement(
  echeances: EcheanceOuverte[],
  montant: number,
): { affectations: Affectation[]; nonAffecte: number } {
  const affectations: Affectation[] = [];
  let disponible = montant;

  for (const e of echeances) {
    if (disponible <= 0) {
      break;
    }
    if (e.reste <= 0) {
      continue;
    }
    const part = Math.min(e.reste, disponible);
    affectations.push({ echeanceId: e.id, montant: part });
    disponible -= part;
  }

  return { affectations, nonAffecte: disponible };
}

export const DELAI_ANNULATION_CAISSIER_MIN = 10;

// Le directeur peut toujours annuler ; le caissier, seulement ses propres
// paiements et dans les 10 minutes.
export function peutAnnulerPaiement(
  membre: { id: string; role: string },
  paiement: { caissierId: string | null; createdAt: Date },
  maintenant = Date.now(),
): boolean {
  if (membre.role === "DIRECTEUR") {
    return true;
  }
  return (
    paiement.caissierId === membre.id &&
    maintenant - paiement.createdAt.getTime() < DELAI_ANNULATION_CAISSIER_MIN * 60 * 1000
  );
}

export function formaterNumeroRecu(annee: number, numero: number): string {
  return `REC-${annee}-${String(numero).padStart(5, "0")}`;
}
