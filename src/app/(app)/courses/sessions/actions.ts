"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";

const schemaSession = z
  .object({
    formationId: z.string().min(1, "Choisissez une formation."),
    nom: z
      .string()
      .trim()
      .min(2, "Donnez un nom à la session.")
      .max(80, "80 caractères maximum."),
    dateDebut: z.iso.date("Date de début invalide."),
    dateFin: z.iso.date("Date de fin invalide."),
    horaires: z.string().trim().max(80, "80 caractères maximum."),
    capacite: z.preprocess(
      (valeur) => (valeur === "" ? undefined : valeur),
      z.coerce
        .number()
        .int("Indiquez un nombre entier.")
        .min(1, "Au moins 1 place.")
        .max(500, "500 places maximum.")
        .optional(),
    ),
    formateurId: z.string(),
  })
  .refine((d) => d.dateFin > d.dateDebut, {
    message: "La date de fin doit être après la date de début.",
    path: ["dateFin"],
  });

export type ChampSession =
  | "formationId"
  | "nom"
  | "dateDebut"
  | "dateFin"
  | "horaires"
  | "capacite"
  | "formateurId";

export type EtatSession = {
  erreurs: Partial<Record<ChampSession, string>>;
  erreurGenerale: string | null;
};

export async function creerSession(
  _etat: EtatSession,
  formData: FormData,
): Promise<EtatSession> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaSession.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatSession["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampSession] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null };
  }
  const donnees = resultat.data;

  // Chaque identifiant reçu du formulaire est revérifié via db (filtré par institut)
  const formation = await db.formation.findFirst({
    where: { id: donnees.formationId, active: true },
  });
  if (!formation) {
    return { erreurs: { formationId: "Formation introuvable." }, erreurGenerale: null };
  }

  if (donnees.formateurId) {
    const formateur = await db.membre.findFirst({
      where: { id: donnees.formateurId, actif: true },
    });
    if (!formateur) {
      return { erreurs: { formateurId: "Formateur introuvable." }, erreurGenerale: null };
    }
  }

  try {
    await db.session.create({
      data: {
        institutId: institut.id,
        formationId: formation.id,
        formateurId: donnees.formateurId || null,
        nom: donnees.nom,
        dateDebut: new Date(donnees.dateDebut),
        dateFin: new Date(donnees.dateFin),
        horaires: donnees.horaires || null,
        capacite: donnees.capacite ?? null,
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
