import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { dateDuJour } from "@/lib/echeancier";
import { MODES_PAIEMENT, type ModePaiementSaisie } from "@/lib/paiements";
import { CATEGORIES_DEPENSE, type CategorieDepenseSaisie } from "@/lib/depenses";

const NON_ANNULE = { annulation: { is: null } };

export type RapportMois = {
  encaisse: number;
  nbPaiements: number;
  annule: number; // paiements du mois annulés ensuite
  parMode: { mode: ModePaiementSaisie; montant: number; nombre: number }[];
  parFormation: { formation: string; montant: number }[];
  paieVersee: number; // bulletins de vacation payés dans le mois
  nbBulletins: number;
  paieAPayer: number; // bulletins du mois validés, pas encore payés
  depenses: number; // dépenses non annulées du mois
  parCategorie: { categorie: CategorieDepenseSaisie; label: string; montant: number }[];
  solde: number; // encaissé − paie versée − dépenses
};

export type SituationImpayes = {
  resteARecouvrer: number; // tout ce qui reste dû sur les inscriptions en cours
  enRetard: number; // dont : échéances dont la date limite est passée
  apprenantsEnRetard: number;
};

export type LigneEvolution = {
  cle: string;
  debut: Date;
  encaisse: number;
  paie: number;
  depenses: number;
  solde: number;
};

function cleMois(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Entrées et sorties d'argent sur un mois (« cle » = « 2026-10 »)
export async function rapportDuMois(db: DbInstitut, debut: Date, fin: Date, cle: string): Promise<RapportMois> {
  const periode = { gte: debut, lt: fin };

  const [modes, annules, repartitions, payees, aPayer, categories] = await Promise.all([
    db.paiement.groupBy({
      by: ["mode"],
      where: { ...NON_ANNULE, date: periode },
      _sum: { montant: true },
      _count: true,
    }),
    db.paiement.aggregate({
      where: { annulation: { isNot: null }, date: periode },
      _sum: { montant: true },
    }),
    db.paiementEcheance.findMany({
      where: { paiement: { ...NON_ANNULE, date: periode } },
      select: {
        montant: true,
        echeance: {
          select: { inscription: { select: { session: { select: { formation: { select: { intitule: true } } } } } } },
        },
      },
    }),
    db.vacation.aggregate({
      where: { statut: "PAYEE", payeeLe: periode },
      _sum: { montantNet: true },
      _count: true,
    }),
    db.vacation.aggregate({
      where: { statut: "VALIDEE", mois: cle },
      _sum: { montantNet: true },
    }),
    db.depense.groupBy({
      by: ["categorie"],
      where: { annuleeLe: null, date: periode },
      _sum: { montant: true },
    }),
  ]);

  const parMode = MODES_PAIEMENT.map(({ valeur }) => {
    const ligne = modes.find((m) => m.mode === valeur);
    return { mode: valeur, montant: ligne?._sum.montant ?? 0, nombre: ligne?._count ?? 0 };
  });
  const encaisse = parMode.reduce((s, m) => s + m.montant, 0);

  const formations = new Map<string, number>();
  for (const r of repartitions) {
    const nom = r.echeance.inscription.session.formation.intitule;
    formations.set(nom, (formations.get(nom) ?? 0) + r.montant);
  }

  const paieVersee = payees._sum.montantNet ?? 0;

  const parCategorie = CATEGORIES_DEPENSE.map(({ valeur, label }) => ({
    categorie: valeur,
    label,
    montant: categories.find((c) => c.categorie === valeur)?._sum.montant ?? 0,
  })).filter((c) => c.montant > 0);
  const depenses = parCategorie.reduce((s, c) => s + c.montant, 0);

  return {
    encaisse,
    nbPaiements: parMode.reduce((s, m) => s + m.nombre, 0),
    annule: annules._sum.montant ?? 0,
    parMode,
    parFormation: [...formations.entries()]
      .map(([formation, montant]) => ({ formation, montant }))
      .sort((a, b) => b.montant - a.montant),
    paieVersee,
    nbBulletins: payees._count,
    paieAPayer: aPayer._sum.montantNet ?? 0,
    depenses,
    parCategorie,
    solde: encaisse - paieVersee - depenses,
  };
}

// Impayés à ce jour (ne dépend pas du mois affiché)
export async function situationImpayes(db: DbInstitut): Promise<SituationImpayes> {
  const enCours = { inscription: { statut: { in: ["ACTIVE" as const, "TERMINEE" as const] } } };

  const echeances = await db.echeance.findMany({
    where: { ...enCours, statut: { in: ["A_PAYER", "PARTIEL"] } },
    select: { montantDu: true, montantPaye: true, dateLimite: true, inscription: { select: { apprenantId: true } } },
  });

  const aujourdhui = dateDuJour();
  const retard = echeances.filter((e) => e.dateLimite < aujourdhui);

  return {
    resteARecouvrer: echeances.reduce((s, e) => s + e.montantDu - e.montantPaye, 0),
    enRetard: retard.reduce((s, e) => s + e.montantDu - e.montantPaye, 0),
    apprenantsEnRetard: new Set(retard.map((e) => e.inscription.apprenantId)).size,
  };
}

// Encaissé, paie versée et dépenses sur les N mois qui finissent par « fin » (exclu), le plus ancien d'abord
export async function evolution(db: DbInstitut, fin: Date, nombreMois: number): Promise<LigneEvolution[]> {
  const debut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - nombreMois, 1));

  const [paiements, vacations, depenses] = await Promise.all([
    db.paiement.findMany({
      where: { ...NON_ANNULE, date: { gte: debut, lt: fin } },
      select: { date: true, montant: true },
    }),
    db.vacation.findMany({
      where: { statut: "PAYEE", payeeLe: { gte: debut, lt: fin } },
      select: { payeeLe: true, montantNet: true },
    }),
    db.depense.findMany({
      where: { annuleeLe: null, date: { gte: debut, lt: fin } },
      select: { date: true, montant: true },
    }),
  ]);

  const lignes: LigneEvolution[] = [];
  for (let i = 0; i < nombreMois; i++) {
    const d = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + i, 1));
    lignes.push({ cle: cleMois(d), debut: d, encaisse: 0, paie: 0, depenses: 0, solde: 0 });
  }
  const ligneDe = (date: Date) => lignes.find((l) => l.cle === cleMois(date));

  for (const p of paiements) {
    const l = ligneDe(p.date);
    if (l) l.encaisse += p.montant;
  }
  for (const v of vacations) {
    const l = v.payeeLe && ligneDe(v.payeeLe);
    if (l) l.paie += v.montantNet;
  }
  for (const dep of depenses) {
    const l = ligneDe(dep.date);
    if (l) l.depenses += dep.montant;
  }
  for (const l of lignes) {
    l.solde = l.encaisse - l.paie - l.depenses;
  }
  return lignes;
}
