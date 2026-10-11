import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import type { ModePaiementSaisie } from "@/lib/paiements";

const JOUR_MS = 86_400_000;

export type BilanCaisse = {
  parMode: Record<ModePaiementSaisie, number>;
  nbPaiements: number;
  nbAnnules: number;
  fonds: number; // espèces présentes dans la caisse au début de la journée
  fondsDeclare: boolean;
  especesEncaissees: number; // espèces reçues des apprenants
  depensesEspeces: number; // dépenses payées en espèces par ce membre ce jour-là
  nbDepensesEspeces: number;
  paieEspeces: number; // bulletins de vacation payés en espèces par ce membre ce jour-là
  nbPaieEspeces: number;
  especes: number; // ce qui doit se trouver physiquement dans la caisse : fonds + encaissé − sorties
  total: number;
};

// Ce qu'un caissier a encaissé et sorti en espèces à une date (annulations exclues).
// Seules les espèces sont dans la caisse ; Wave, Orange Money et virements sont sur les comptes.
export async function bilanCaissier(db: DbInstitut, caissierId: string, date: Date): Promise<BilanCaisse> {
  const lendemain = new Date(date.getTime() + JOUR_MS);

  const [fonds, paiements, depenses, vacations] = await Promise.all([
    db.fondsCaisse.findFirst({ where: { caissierId, date }, select: { montant: true } }),
    db.paiement.findMany({
      where: { caissierId, date: { gte: date, lt: lendemain } },
      select: { mode: true, montant: true, annulation: { select: { id: true } } },
    }),
    db.depense.aggregate({
      where: { saisieParId: caissierId, mode: "ESPECES", annuleeLe: null, date },
      _sum: { montant: true },
      _count: true,
    }),
    db.vacation.aggregate({
      where: { payeeParId: caissierId, modePaiement: "ESPECES", payeeLe: { gte: date, lt: lendemain } },
      _sum: { montantNet: true },
      _count: true,
    }),
  ]);

  const parMode: Record<ModePaiementSaisie, number> = { ESPECES: 0, WAVE: 0, ORANGE_MONEY: 0, VIREMENT: 0 };
  let nbAnnules = 0;
  for (const p of paiements) {
    if (p.annulation) {
      nbAnnules += 1;
      continue;
    }
    parMode[p.mode] += p.montant;
  }

  const depensesEspeces = depenses._sum.montant ?? 0;
  const paieEspeces = vacations._sum.montantNet ?? 0;

  return {
    parMode,
    nbPaiements: paiements.length - nbAnnules,
    nbAnnules,
    fonds: fonds?.montant ?? 0,
    fondsDeclare: fonds !== null,
    especesEncaissees: parMode.ESPECES,
    depensesEspeces,
    nbDepensesEspeces: depenses._count,
    paieEspeces,
    nbPaieEspeces: vacations._count,
    especes: (fonds?.montant ?? 0) + parMode.ESPECES - depensesEspeces - paieEspeces,
    total: Object.values(parMode).reduce((s, m) => s + m, 0),
  };
}

// La caisse de ce caissier est-elle déjà clôturée pour cette date ?
export async function caisseCloturee(db: DbInstitut, caissierId: string, date: Date): Promise<boolean> {
  const cloture = await db.clotureCaisse.findFirst({ where: { caissierId, date }, select: { id: true } });
  return Boolean(cloture);
}

// Membres qui ont manipulé de l'argent ce jour-là (encaissement, dépense ou paie)
export async function membresAvecCaisse(db: DbInstitut, date: Date): Promise<{ id: string; nom: string }[]> {
  const lendemain = new Date(date.getTime() + JOUR_MS);
  const selection = { select: { id: true, utilisateur: { select: { nom: true } } } };

  const [paiements, depenses, vacations] = await Promise.all([
    db.paiement.findMany({
      where: { date: { gte: date, lt: lendemain }, caissierId: { not: null } },
      distinct: ["caissierId"],
      select: { caissier: selection },
    }),
    db.depense.findMany({
      where: { date, mode: "ESPECES" },
      distinct: ["saisieParId"],
      select: { saisiePar: selection },
    }),
    db.vacation.findMany({
      where: { payeeLe: { gte: date, lt: lendemain }, modePaiement: "ESPECES", payeeParId: { not: null } },
      distinct: ["payeeParId"],
      select: { payeePar: selection },
    }),
  ]);

  const membres = new Map<string, string>();
  for (const m of [
    ...paiements.map((p) => p.caissier),
    ...depenses.map((d) => d.saisiePar),
    ...vacations.map((v) => v.payeePar),
  ]) {
    if (m) membres.set(m.id, m.utilisateur.nom);
  }
  return [...membres.entries()].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
