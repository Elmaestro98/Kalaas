"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { referenceObligatoire } from "@/lib/paiements";

const MONTANT_MAX = 100_000_000;

// ─── Enregistrer une dépense ───────────────────────

const schemaDepense = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date."),
    montant: z.coerce
      .number()
      .int("Montant sans virgule.")
      .min(1, "Indiquez le montant payé.")
      .max(MONTANT_MAX, "Montant trop élevé, vérifiez le nombre de zéros."),
    categorie: z.enum(
      ["LOYER", "EAU_ELECTRICITE", "INTERNET_TELEPHONE", "SALAIRES", "FOURNITURES", "PUBLICITE", "AUTRE"],
      "Choisissez une catégorie.",
    ),
    description: z.string().trim().min(3, "Décrivez la dépense.").max(200, "200 caractères maximum."),
    mode: z.enum(["ESPECES", "WAVE", "ORANGE_MONEY", "VIREMENT"], "Choisissez le moyen de paiement."),
    reference: z.string().trim().max(60, "60 caractères maximum."),
  })
  .superRefine((d, ctx) => {
    if (referenceObligatoire(d.mode) && d.reference.length < 4) {
      ctx.addIssue({ code: "custom", path: ["reference"], message: "Indiquez la référence de la transaction." });
    }
  });

export type ChampDepense = "date" | "montant" | "categorie" | "description" | "mode" | "reference";

export type EtatDepense = {
  erreurs: Partial<Record<ChampDepense, string>>;
  erreurGenerale: string | null;
};

export async function enregistrerDepense(_etat: EtatDepense, formData: FormData): Promise<EtatDepense> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaDepense.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatDepense["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampDepense] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null };
  }
  const d = resultat.data;

  const date = new Date(`${d.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date > dateDuJour()) {
    return { erreurs: { date: "La date ne peut pas être dans le futur." }, erreurGenerale: null };
  }

  try {
    await db.$transaction(async (tx) => {
      const depense = await tx.depense.create({
        data: {
          institutId: institut.id,
          date,
          montant: d.montant,
          categorie: d.categorie,
          description: d.description,
          mode: d.mode,
          reference: referenceObligatoire(d.mode) ? d.reference.toUpperCase() : null,
          saisieParId: membre.id,
        },
      });
      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "DEPENSE_ENREGISTREE",
          entite: "Depense",
          entiteId: depense.id,
          apres: { date: d.date, montant: d.montant, categorie: d.categorie, description: d.description, mode: d.mode },
        },
      });
    });
  } catch {
    return { erreurs: {}, erreurGenerale: "L'enregistrement a échoué. Réessayez dans un instant." };
  }

  revalidatePath("/expenses");
  revalidatePath("/reports");
  redirect(`/expenses?mois=${d.date.slice(0, 7)}&nouveau=1`);
}

// ─── Annuler une dépense (jamais de suppression) ───

const schemaAnnulation = z.object({
  depenseId: z.string().min(1),
  motif: z.string().trim().min(3, "Expliquez pourquoi cette dépense est annulée.").max(200, "200 caractères maximum."),
});

export type EtatAnnulationDepense = { erreur: string | null };

export async function annulerDepense(
  _etat: EtatAnnulationDepense,
  formData: FormData,
): Promise<EtatAnnulationDepense> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaAnnulation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message };
  }
  const { depenseId, motif } = resultat.data;

  const depense = await db.depense.findFirst({ where: { id: depenseId } });
  if (!depense) {
    return { erreur: "Dépense introuvable." };
  }

  const { count } = await db.$transaction(async (tx) => {
    const maj = await tx.depense.updateMany({
      where: { id: depense.id, annuleeLe: null },
      data: { annuleeLe: new Date(), annuleeParId: membre.id, motifAnnulation: motif },
    });
    if (maj.count === 1) {
      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "DEPENSE_ANNULEE",
          entite: "Depense",
          entiteId: depense.id,
          avant: { montant: depense.montant, categorie: depense.categorie, description: depense.description },
          apres: { motif },
        },
      });
    }
    return maj;
  });
  if (count === 0) {
    return { erreur: "Cette dépense est déjà annulée." };
  }

  revalidatePath("/expenses");
  revalidatePath("/reports");
  return { erreur: null };
}
