export type StatutSession = "A_VENIR" | "EN_COURS" | "TERMINEE";

export function statutSession(
  dateDebut: Date,
  dateFin: Date,
  maintenant = new Date(),
): StatutSession {
  const aujourdhui = maintenant.toISOString().slice(0, 10);
  const debut = dateDebut.toISOString().slice(0, 10);
  const fin = dateFin.toISOString().slice(0, 10);

  if (aujourdhui < debut) {
    return "A_VENIR";
  }
  if (aujourdhui > fin) {
    return "TERMINEE";
  }
  return "EN_COURS";
}

export const STATUT_SESSION: Record<StatutSession, { label: string; classe: string }> = {
  A_VENIR: { label: "À venir", classe: "bg-info-soft text-info" },
  EN_COURS: { label: "En cours", classe: "bg-success-soft text-success" },
  TERMINEE: { label: "Terminée", classe: "bg-surface-100 text-ink-muted" },
};
