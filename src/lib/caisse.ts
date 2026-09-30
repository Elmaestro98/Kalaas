import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import type { ModePaiementSaisie } from "@/lib/paiements";

const JOUR_MS = 86_400_000;

export type BilanCaisse = {
  parMode: Record<ModePaiementSaisie, number>;
  nbPaiements: number;
  nbAnnules: number;
  especes: number; // ce qui doit se trouver physiquement dans la caisse
  total: number;
};

// Ce qu'un caissier a encaissé à une date (paiements annulés exclus).
// Seules les espèces sont dans la caisse ; Wave, Orange Money et virements sont sur les comptes.
export async function bilanCaissier(db: DbInstitut, caissierId: string, date: Date): Promise<BilanCaisse> {
  const paiements = await db.paiement.findMany({
    where: { caissierId, date: { gte: date, lt: new Date(date.getTime() + JOUR_MS) } },
    select: { mode: true, montant: true, annulation: { select: { id: true } } },
  });

  const parMode: Record<ModePaiementSaisie, number> = { ESPECES: 0, WAVE: 0, ORANGE_MONEY: 0, VIREMENT: 0 };
  let nbAnnules = 0;
  for (const p of paiements) {
    if (p.annulation) {
      nbAnnules += 1;
      continue;
    }
    parMode[p.mode] += p.montant;
  }

  return {
    parMode,
    nbPaiements: paiements.length - nbAnnules,
    nbAnnules,
    especes: parMode.ESPECES,
    total: Object.values(parMode).reduce((s, m) => s + m, 0),
  };
}

// La caisse de ce caissier est-elle déjà clôturée pour cette date ?
export async function caisseCloturee(db: DbInstitut, caissierId: string, date: Date): Promise<boolean> {
  const cloture = await db.clotureCaisse.findFirst({ where: { caissierId, date }, select: { id: true } });
  return Boolean(cloture);
}
