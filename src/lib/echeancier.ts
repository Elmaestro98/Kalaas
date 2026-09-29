import type { TonBadge } from "@/components/ui/badge";

// ─── Montants ──────────────────────────────────────

// Répartit un montant en N parts entières dont la somme est exacte.
// Ex. 400 000 en 6 → [66 667, 66 667, 66 667, 66 667, 66 666, 66 666]
export function repartirMontant(total: number, nombre: number): number[] {
  if (nombre < 1 || total < 0) {
    return [];
  }

  const base = Math.floor(total / nombre);
  const reste = total - base * nombre;

  return Array.from({ length: nombre }, (_, index) =>
    index < reste ? base + 1 : base,
  );
}

export type GroupeMontant = { nombre: number; montant: number };

// Regroupe les montants identiques qui se suivent.
// Ex. [66 667, 66 667, 66 666] → [{ 2 × 66 667 }, { 1 × 66 666 }]
export function grouperMontants(montants: number[]): GroupeMontant[] {
  const groupes: GroupeMontant[] = [];

  for (const montant of montants) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.montant === montant) {
      dernier.nombre += 1;
    } else {
      groupes.push({ nombre: 1, montant });
    }
  }

  return groupes;
}

export type TypeRemiseSaisie = "MONTANT" | "POURCENTAGE";

// La remise se déduit du prix de la formation (les mensualités),
// jamais des frais d'inscription. Elle ne dépasse jamais le prix.
export function calculerRemise(
  prixTotal: number,
  type: TypeRemiseSaisie | null | undefined,
  valeur: number,
): number {
  if (!type || valeur <= 0) {
    return 0;
  }
  const remise =
    type === "POURCENTAGE"
      ? Math.round((prixTotal * Math.min(valeur, 100)) / 100)
      : valeur;
  return Math.min(remise, prixTotal);
}

// ─── Dates (toujours en UTC, sans heure) ───────────

export function dateDuJour(maintenant = new Date()): Date {
  return new Date(
    Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()),
  );
}

// Ajoute N mois en restant sur un jour valide : 31 janv. + 1 mois → 28 févr.
export function ajouterMois(date: Date, mois: number): Date {
  const annee = date.getUTCFullYear();
  const moisCible = date.getUTCMonth() + mois;
  const jour = date.getUTCDate();
  const dernierJour = new Date(Date.UTC(annee, moisCible + 1, 0)).getUTCDate();
  return new Date(Date.UTC(annee, moisCible, Math.min(jour, dernierJour)));
}

// ─── Génération de l'échéancier ────────────────────

export type EcheanceGeneree = {
  type: "INSCRIPTION" | "MENSUALITE";
  libelle: string;
  ordre: number;
  montantDu: number;
  dateLimite: Date;
};

type ParamsEcheancier = {
  fraisInscription: number;
  prixTotal: number;
  nbMensualites: number;
  remise: number;
  dateInscription: Date;
  debutSession: Date;
};

// 1 ligne pour les frais d'inscription (payés une seule fois, le jour même),
// puis une mensualité par mois à partir du début de la session.
// Une échéance n'est jamais fixée avant le jour de l'inscription.
export function genererEcheances(p: ParamsEcheancier): EcheanceGeneree[] {
  const echeances: EcheanceGeneree[] = [];

  if (p.fraisInscription > 0) {
    echeances.push({
      type: "INSCRIPTION",
      libelle: "Frais d'inscription",
      ordre: 0,
      montantDu: p.fraisInscription,
      dateLimite: p.dateInscription,
    });
  }

  const montants = repartirMontant(p.prixTotal - p.remise, p.nbMensualites);
  montants.forEach((montant, index) => {
    if (montant <= 0) {
      return;
    }
    const prevue = ajouterMois(p.debutSession, index);
    echeances.push({
      type: "MENSUALITE",
      libelle: `Mensualité ${index + 1}/${p.nbMensualites}`,
      ordre: index + 1,
      montantDu: montant,
      dateLimite: prevue < p.dateInscription ? p.dateInscription : prevue,
    });
  });

  return echeances;
}

// ─── État et résumé financier ──────────────────────

type EcheanceLue = {
  montantDu: number;
  montantPaye: number;
  dateLimite: Date;
  statut: string;
};

export type EtatEcheance = "PAYEE" | "PARTIEL" | "EN_RETARD" | "A_VENIR" | "ANNULEE";

export function etatEcheance(e: EcheanceLue, aujourdhui = dateDuJour()): EtatEcheance {
  if (e.statut === "ANNULEE") {
    return "ANNULEE";
  }
  if (e.montantPaye >= e.montantDu) {
    return "PAYEE";
  }
  if (e.dateLimite < aujourdhui) {
    return "EN_RETARD";
  }
  if (e.montantPaye > 0) {
    return "PARTIEL";
  }
  return "A_VENIR";
}

export const ETAT_ECHEANCE: Record<EtatEcheance, { label: string; ton: TonBadge }> = {
  PAYEE: { label: "Payée", ton: "success" },
  PARTIEL: { label: "Partiel", ton: "warning" },
  EN_RETARD: { label: "En retard", ton: "danger" },
  A_VENIR: { label: "À venir", ton: "neutral" },
  ANNULEE: { label: "Annulée", ton: "neutral" },
};

export type ResumeFinancier = {
  total: number;
  paye: number;
  reste: number;
  enRetard: number;
  prochaine: { date: Date; montant: number } | null;
};

export function resumeFinancier(
  echeances: EcheanceLue[],
  aujourdhui = dateDuJour(),
): ResumeFinancier {
  let total = 0;
  let paye = 0;
  let enRetard = 0;
  let prochaine: ResumeFinancier["prochaine"] = null;

  for (const e of echeances) {
    if (e.statut === "ANNULEE") {
      continue;
    }
    total += e.montantDu;
    paye += Math.min(e.montantPaye, e.montantDu);

    const reste = e.montantDu - e.montantPaye;
    if (reste <= 0) {
      continue;
    }
    if (e.dateLimite < aujourdhui) {
      enRetard += reste;
    } else if (!prochaine || e.dateLimite < prochaine.date) {
      prochaine = { date: e.dateLimite, montant: reste };
    }
  }

  return { total, paye, reste: total - paye, enRetard, prochaine };
}

export type StatutFinancier = "A_JOUR" | "EN_RETARD" | "SOLDE";

export function statutFinancier(r: ResumeFinancier): StatutFinancier {
  if (r.total > 0 && r.reste === 0) {
    return "SOLDE";
  }
  if (r.enRetard > 0) {
    return "EN_RETARD";
  }
  return "A_JOUR";
}

export const STATUT_FINANCIER: Record<StatutFinancier, { label: string; ton: TonBadge }> = {
  A_JOUR: { label: "À jour", ton: "info" },
  EN_RETARD: { label: "En retard", ton: "danger" },
  SOLDE: { label: "Soldé", ton: "success" },
};
