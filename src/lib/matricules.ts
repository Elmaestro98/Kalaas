import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { formaterMatricule, prefixeParDefaut } from "@/lib/lmd";

type ClientCompteur = Pick<DbInstitut, "compteurMatricule">;

// Donne le prochain matricule de l'établissement (ex. ITF-2026-0001).
// À appeler DANS la transaction d'inscription : l'incrément est atomique.
export async function prochainMatricule(
  tx: ClientCompteur,
  institut: { id: string; nom: string; prefixeMatricule: string | null },
  annee: number,
): Promise<string> {
  const compteur = await tx.compteurMatricule.upsert({
    where: { institutId_annee: { institutId: institut.id, annee } },
    create: { institutId: institut.id, annee, dernier: 1 },
    update: { dernier: { increment: 1 } },
  });
  const prefixe = institut.prefixeMatricule || prefixeParDefaut(institut.nom);
  return formaterMatricule(prefixe, annee, compteur.dernier);
}
