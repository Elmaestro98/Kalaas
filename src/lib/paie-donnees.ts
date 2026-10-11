import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { formaterNumeroVacation } from "@/lib/paie";

type ClientCompteur = Pick<DbInstitut, "compteurVacation">;

// Prochain numéro de bulletin de l'institut pour l'année (VAC-2026-00001…).
// À appeler DANS la transaction de validation : l'incrément est atomique.
export async function prochainNumeroVacation(
  tx: ClientCompteur,
  institutId: string,
  annee: number,
): Promise<string> {
  const compteur = await tx.compteurVacation.upsert({
    where: { institutId_annee: { institutId, annee } },
    create: { institutId, annee, dernier: 1 },
    update: { dernier: { increment: 1 } },
  });
  return formaterNumeroVacation(annee, compteur.dernier);
}
