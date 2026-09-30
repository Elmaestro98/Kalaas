"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { bilanCaissier } from "@/lib/caisse";

const schemaCloture = z.object({
  montantCompte: z.coerce
    .number()
    .int("Montant sans virgule.")
    .min(0, "Montant invalide.")
    .max(1_000_000_000, "Montant trop élevé, vérifiez le nombre de zéros."),
  commentaire: z.string().trim().max(300, "300 caractères maximum."),
});

export type EtatCloture = { erreur: string | null };

// Clôture la caisse du jour du membre connecté. Le montant théorique est
// toujours recalculé côté serveur (jamais transmis par le formulaire).
export async function cloturerCaisse(_etat: EtatCloture, formData: FormData): Promise<EtatCloture> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaCloture.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message };
  }
  const { montantCompte, commentaire } = resultat.data;

  const aujourdhui = dateDuJour();
  const bilan = await bilanCaissier(db, membre.id, aujourdhui);
  const ecart = montantCompte - bilan.especes;

  if (ecart !== 0 && commentaire.length < 3) {
    return { erreur: "Il y a un écart : expliquez-le dans le commentaire (obligatoire)." };
  }

  try {
    await db.$transaction(async (tx) => {
      const cloture = await tx.clotureCaisse.create({
        data: {
          institutId: institut.id,
          caissierId: membre.id,
          date: aujourdhui,
          montantTheorique: bilan.especes,
          montantCompte,
          ecart,
          commentaire: commentaire || null,
        },
      });

      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "CAISSE_CLOTUREE",
          entite: "ClotureCaisse",
          entiteId: cloture.id,
          apres: {
            date: aujourdhui.toISOString().slice(0, 10),
            montantTheorique: bilan.especes,
            montantCompte,
            ecart,
            autresModes: { WAVE: bilan.parMode.WAVE, ORANGE_MONEY: bilan.parMode.ORANGE_MONEY, VIREMENT: bilan.parMode.VIREMENT },
          },
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erreur: "Votre caisse est déjà clôturée pour aujourd'hui." };
    }
    return { erreur: "La clôture a échoué. Réessayez." };
  }

  revalidatePath("/payments/closing");
  revalidatePath("/payments");
  return { erreur: null };
}
