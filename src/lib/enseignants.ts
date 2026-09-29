import type { TonBadge } from "@/components/ui/badge";

export type StatutEnseignantSaisie = "PERMANENT" | "VACATAIRE";

export const STATUT_ENSEIGNANT: Record<StatutEnseignantSaisie, { label: string; ton: TonBadge }> = {
  PERMANENT: { label: "Permanent", ton: "info" },
  VACATAIRE: { label: "Vacataire", ton: "gold" },
};

export function nomEnseignant(e: { prenom: string; nom: string }): string {
  return `${e.prenom} ${e.nom}`.trim();
}

export function initialesEnseignant(e: { prenom: string; nom: string }): string {
  return `${e.prenom[0] ?? ""}${e.nom[0] ?? ""}`.toUpperCase();
}
