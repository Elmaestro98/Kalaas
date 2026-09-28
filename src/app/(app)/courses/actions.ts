"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";

const MONTANT_MAX = 100_000_000;

const schemaFormation = z.object({
  intitule: z
    .string()
    .trim()
    .min(2, "Indiquez l'intitulé de la formation.")
    .max(120, "120 caractères maximum."),
  dureeMois: z.coerce
    .number()
    .int("Indiquez un nombre de mois entier.")
    .min(1, "Au moins 1 mois.")
    .max(60, "60 mois maximum."),
  fraisInscription: z.coerce
    .number()
    .int("Montant sans virgule.")
    .min(0, "Montant invalide.")
    .max(MONTANT_MAX, "Montant trop élevé, vérifiez le nombre de zéros."),
  prixTotal: z.coerce
    .number()
    .int("Montant sans virgule.")
    .min(1, "Indiquez le prix de la formation.")
    .max(MONTANT_MAX, "Montant trop élevé, vérifiez le nombre de zéros."),
  nbMensualites: z.coerce
    .number()
    .int("Indiquez un nombre entier.")
    .min(1, "Au moins 1 mensualité.")
    .max(36, "36 mensualités maximum."),
});

export type ChampFormation = keyof z.infer<typeof schemaFormation>;

export type EtatFormation = {
  erreurs: Partial<Record<ChampFormation, string>>;
  erreurGenerale: string | null;
};

export async function creerFormation(
  _etat: EtatFormation,
  formData: FormData,
): Promise<EtatFormation> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaFormation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatFormation["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampFormation] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null };
  }
  const donnees = resultat.data;

  const doublon = await db.formation.findFirst({
    where: {
      active: true,
      intitule: { equals: donnees.intitule, mode: "insensitive" },
    },
  });
  if (doublon) {
    return {
      erreurs: { intitule: "Une formation porte déjà ce nom." },
      erreurGenerale: null,
    };
  }

  try {
    await db.formation.create({
      data: {
        institutId: institut.id,
        ...donnees,
      },
    });
  } catch {
    return {
      erreurs: {},
      erreurGenerale: "L'enregistrement a échoué. Réessayez dans un instant.",
    };
  }

  revalidatePath("/courses");
  redirect("/courses");
}
