// Outils des emplois du temps (utilisables côté serveur, client et PDF).

export type Jour = "LUNDI" | "MARDI" | "MERCREDI" | "JEUDI" | "VENDREDI" | "SAMEDI" | "DIMANCHE";

export const JOURS: { valeur: Jour; label: string; court: string }[] = [
  { valeur: "LUNDI", label: "Lundi", court: "Lun." },
  { valeur: "MARDI", label: "Mardi", court: "Mar." },
  { valeur: "MERCREDI", label: "Mercredi", court: "Mer." },
  { valeur: "JEUDI", label: "Jeudi", court: "Jeu." },
  { valeur: "VENDREDI", label: "Vendredi", court: "Ven." },
  { valeur: "SAMEDI", label: "Samedi", court: "Sam." },
  { valeur: "DIMANCHE", label: "Dimanche", court: "Dim." },
];

// 510 → « 08h30 »
export function formatHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

// « 08:30 » (champ <input type="time">) → 510 ; null si invalide
export function heureVersMinutes(saisie: string): number | null {
  const correspondance = /^(\d{1,2}):(\d{2})$/.exec(saisie.trim());
  if (!correspondance) {
    return null;
  }
  const h = Number(correspondance[1]);
  const m = Number(correspondance[2]);
  if (h > 23 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

export type CreneauAffiche = {
  id: string;
  jour: Jour;
  heureDebut: number;
  heureFin: number;
  matiere: string;
  matiereId: string | null;
  // Lignes d'information selon la vue (classe, enseignant, salle)
  details: string[];
};

// Jours à afficher : lundi → samedi, plus dimanche s'il a des cours
export function joursAffiches(creneaux: { jour: Jour }[]): typeof JOURS {
  const avecDimanche = creneaux.some((c) => c.jour === "DIMANCHE");
  return JOURS.filter((j) => j.valeur !== "DIMANCHE" || avecDimanche);
}

export function creneauxDuJour<T extends { jour: Jour; heureDebut: number }>(creneaux: T[], jour: Jour): T[] {
  return creneaux.filter((c) => c.jour === jour).sort((a, b) => a.heureDebut - b.heureDebut);
}

export function dureeTotaleHebdo(creneaux: { heureDebut: number; heureFin: number }[]): string {
  const minutes = creneaux.reduce((s, c) => s + (c.heureFin - c.heureDebut), 0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// ─── Suivi des heures ──────────────────────────────

// Nombre de semaines de cours d'une session (au moins 1)
export function nbSemaines(debut: Date, fin: Date): number {
  const jours = Math.round((fin.getTime() - debut.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.round(jours / 7));
}

export function minutesHebdo(creneaux: { heureDebut: number; heureFin: number }[]): number {
  return creneaux.reduce((s, c) => s + (c.heureFin - c.heureDebut), 0);
}

export type EtatVolume = "SANS_OBJECTIF" | "INSUFFISANT" | "CONFORME" | "DEPASSEMENT";

// Compare les heures programmées sur la session aux heures prévues (tolérance de 10 %)
export function etatVolume(heuresProgrammees: number, heuresPrevues: number | null): EtatVolume {
  if (!heuresPrevues) {
    return "SANS_OBJECTIF";
  }
  if (heuresProgrammees < heuresPrevues * 0.9) {
    return "INSUFFISANT";
  }
  if (heuresProgrammees > heuresPrevues * 1.1) {
    return "DEPASSEMENT";
  }
  return "CONFORME";
}

export const ETAT_VOLUME: Record<EtatVolume, { label: string; classe: string }> = {
  SANS_OBJECTIF: { label: "", classe: "bg-surface-200 text-ink-muted" },
  INSUFFISANT: { label: "Insuffisant", classe: "bg-warning-soft text-warning" },
  CONFORME: { label: "Conforme", classe: "bg-success-soft text-success" },
  DEPASSEMENT: { label: "Dépassement", classe: "bg-danger-soft text-danger" },
};

// ─── Jour courant et message WhatsApp ──────────────

const JOURS_JS: Jour[] = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

// Jour de la semaine à Dakar (UTC+0 toute l'année)
export function jourActuel(maintenant = new Date()): Jour {
  return JOURS_JS[maintenant.getUTCDay()];
}

export function messageProgrammation(
  prenom: string,
  etablissement: string,
  creneaux: CreneauAffiche[],
): string {
  const lignes = [`Bonjour ${prenom},`, `Voici votre programmation hebdomadaire – ${etablissement} :`, ""];

  for (const j of joursAffiches(creneaux)) {
    const cours = creneauxDuJour(creneaux, j.valeur);
    if (cours.length === 0) {
      continue;
    }
    lignes.push(`*${j.label}*`);
    for (const c of cours) {
      const details = c.details.length ? ` (${c.details.join(" · ")})` : "";
      lignes.push(`• ${formatHeure(c.heureDebut)}–${formatHeure(c.heureFin)} ${c.matiere}${details}`);
    }
    lignes.push("");
  }

  lignes.push(`Total : ${dureeTotaleHebdo(creneaux)} par semaine.`);
  return lignes.join("\n");
}
