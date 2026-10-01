// Calcul des notes (utilisable côté serveur et client).
// Règles retenues :
//  • moyenne d'une matière = moyenne des évaluations pondérée par leur poids (%)
//  • moyenne d'une UE      = moyenne des matières pondérée par leurs coefficients
//  • moyenne du semestre   = moyenne des UE pondérée par leurs crédits
//  • UE validée si ≥ 10, ou par compensation si la moyenne du semestre est ≥ 10
// Absent = 0 ; dispensé = l'évaluation ne compte pas ; note non saisie = moyenne provisoire.

export type StatutNoteSaisie = "NOTEE" | "ABSENT" | "DISPENSE";
export type TypeEvaluationSaisie = "DEVOIR" | "EXAMEN" | "TP" | "ORAL" | "PROJET" | "AUTRE";

export const TYPES_EVALUATION: { valeur: TypeEvaluationSaisie; label: string }[] = [
  { valeur: "DEVOIR", label: "Devoir" },
  { valeur: "EXAMEN", label: "Examen" },
  { valeur: "TP", label: "TP" },
  { valeur: "ORAL", label: "Oral" },
  { valeur: "PROJET", label: "Projet" },
  { valeur: "AUTRE", label: "Autre" },
];

export const SEUIL_VALIDATION = 10;

export function arrondi2(n: number): number {
  return Math.round(n * 100) / 100;
}

// 12,68 → « 12,68 »
export function formatNote(n: number | null): string {
  return n === null ? "—" : n.toFixed(2).replace(".", ",");
}

// « 12,5 » ou « 12.5 » → 1250 (centièmes), null si invalide ou hors barème
export function lireNote(saisie: string, bareme: number): number | null {
  const texte = saisie.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(texte)) return null;
  const valeur = Math.round(Number(texte) * 100);
  return valeur >= 0 && valeur <= bareme * 100 ? valeur : null;
}

// 1250 sur 20 → « 12,5 » (pour remplir un champ)
export function noteVersSaisie(valeur: number | null): string {
  if (valeur === null) return "";
  return String(valeur / 100).replace(".", ",");
}

export type EvaluationPourCalcul = {
  poids: number;
  bareme: number;
  note: { statut: StatutNoteSaisie; valeur: number | null } | null;
};

export type MoyenneMatiere = { moyenne: number | null; complete: boolean };

export function moyenneMatiere(evaluations: EvaluationPourCalcul[]): MoyenneMatiere {
  let somme = 0;
  let poids = 0;
  let complete = evaluations.length > 0;

  for (const e of evaluations) {
    if (!e.note) {
      complete = false;
      continue;
    }
    if (e.note.statut === "DISPENSE") continue;
    let sur20: number;
    if (e.note.statut === "ABSENT") {
      sur20 = 0;
    } else if (e.note.valeur === null) {
      complete = false;
      continue;
    } else {
      sur20 = (e.note.valeur / 100 / e.bareme) * 20;
    }
    somme += sur20 * e.poids;
    poids += e.poids;
  }

  return { moyenne: poids > 0 ? arrondi2(somme / poids) : null, complete };
}

// Moyenne pondérée qui ignore les valeurs manquantes (poids nul ou absent = 1)
export function moyennePonderee(elements: { valeur: number | null; poids: number | null }[]): number | null {
  let somme = 0;
  let total = 0;
  for (const e of elements) {
    if (e.valeur === null) continue;
    const p = e.poids && e.poids > 0 ? e.poids : 1;
    somme += e.valeur * p;
    total += p;
  }
  return total > 0 ? arrondi2(somme / total) : null;
}

export type Decision = "VALIDEE" | "COMPENSEE" | "NON_VALIDEE";

export type UEPourCalcul = {
  id: string;
  intitule: string;
  credits: number | null;
  matieres: { id: string; intitule: string; coefficient: number | null; moyenne: MoyenneMatiere }[];
};

export type ResultatUE = {
  id: string;
  intitule: string;
  credits: number;
  moyenne: number | null;
  complete: boolean;
  decision: Decision | null;
};

export type ResultatSemestre = {
  ues: ResultatUE[];
  moyenne: number | null;
  complete: boolean;
  creditsAcquis: number;
  creditsTotal: number;
  valide: boolean | null;
};

export function resultatSemestre(ues: UEPourCalcul[]): ResultatSemestre {
  const calculees = ues.map((ue) => ({
    id: ue.id,
    intitule: ue.intitule,
    credits: ue.credits ?? 0,
    moyenne: moyennePonderee(ue.matieres.map((m) => ({ valeur: m.moyenne.moyenne, poids: m.coefficient }))),
    complete: ue.matieres.length > 0 && ue.matieres.every((m) => m.moyenne.complete),
  }));

  const moyenne = moyennePonderee(calculees.map((u) => ({ valeur: u.moyenne, poids: u.credits })));
  const semestreValide = moyenne !== null ? moyenne >= SEUIL_VALIDATION : null;

  const resultats: ResultatUE[] = calculees.map((u) => ({
    ...u,
    decision:
      u.moyenne === null
        ? null
        : u.moyenne >= SEUIL_VALIDATION
          ? "VALIDEE"
          : semestreValide
            ? "COMPENSEE"
            : "NON_VALIDEE",
  }));

  return {
    ues: resultats,
    moyenne,
    complete: resultats.length > 0 && resultats.every((u) => u.complete),
    creditsAcquis: resultats
      .filter((u) => u.decision === "VALIDEE" || u.decision === "COMPENSEE")
      .reduce((s, u) => s + u.credits, 0),
    creditsTotal: resultats.reduce((s, u) => s + u.credits, 0),
    valide: semestreValide,
  };
}

export const LIBELLE_DECISION: Record<Decision, { label: string; classe: string }> = {
  VALIDEE: { label: "Validée", classe: "bg-success-soft text-success" },
  COMPENSEE: { label: "Compensée", classe: "bg-info-soft text-info" },
  NON_VALIDEE: { label: "Non validée", classe: "bg-danger-soft text-danger" },
};

// Mention d'après la moyenne sur 20 (usage courant au Sénégal)
export function mention(moyenne: number | null): string | null {
  if (moyenne === null || moyenne < SEUIL_VALIDATION) return null;
  if (moyenne >= 16) return "Très bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez bien";
  return "Passable";
}

// Rang d'une moyenne dans la classe (ex aequo : même rang), null sans moyenne
export function rang(moyennes: (number | null)[], moyenne: number | null): number | null {
  if (moyenne === null) return null;
  return moyennes.filter((m) => m !== null && m > moyenne).length + 1;
}
