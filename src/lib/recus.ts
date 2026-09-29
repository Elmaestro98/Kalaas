import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { formaterNumeroRecu } from "@/lib/paiements";

type ClientCompteur = Pick<DbInstitut, "compteurRecu">;

// Donne le prochain numéro de reçu de l'institut pour l'année (REC-2026-00001…).
// À appeler DANS la transaction du paiement : l'incrément est atomique,
// deux caissiers ne peuvent donc jamais obtenir le même numéro.
export async function prochainNumeroRecu(
  tx: ClientCompteur,
  institutId: string,
  annee: number,
): Promise<string> {
  const compteur = await tx.compteurRecu.upsert({
    where: { institutId_annee: { institutId, annee } },
    create: { institutId, annee, dernier: 1 },
    update: { dernier: { increment: 1 } },
  });
  return formaterNumeroRecu(annee, compteur.dernier);
}
