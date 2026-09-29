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
