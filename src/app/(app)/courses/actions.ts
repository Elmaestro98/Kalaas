"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { flash } from "@/lib/flash";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { CYCLES, aDesNiveaux, codeNiveau, estLmd, intituleNiveau } from "@/lib/lmd";

const MONTANT_MAX = 100_000_000;

const schemaFormation = z
  .object({
    cycle: z.enum(
      ["FORMATION_COURTE", "LICENCE", "MASTER", "DOCTORAT", "PRESCOLAIRE", "ELEMENTAIRE", "MOYEN", "SECONDAIRE"],
      "Choisissez le type de formation.",
    ),
    intitule: z.string().trim().max(120, "120 caractères maximum."),
    filiere: z.string().trim().max(80, "80 caractères maximum."),
    niveau: z.preprocess(
      (v) => (v === "" || v === undefined ? undefined : v),
      z.coerce.number().int().optional(),
    ),
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
  })
  .superRefine((d, ctx) => {
    if (!aDesNiveaux(d.cycle)) {
      if (d.intitule.length < 2) {
        ctx.addIssue({ code: "custom", path: ["intitule"], message: "Indiquez l'intitulé de la formation." });
      }
      return;
    }
    // La filière est obligatoire en LMD ; à l'école, la série (lycée) est facultative
    if (estLmd(d.cycle) && d.filiere.length < 2) {
      ctx.addIssue({ code: "custom", path: ["filiere"], message: "Indiquez la filière (ex. Informatique de gestion)." });
    }
    const max = CYCLES[d.cycle].niveaux.length;
    if (!d.niveau || d.niveau < 1 || d.niveau > max) {
      ctx.addIssue({ code: "custom", path: ["niveau"], message: "Choisissez le niveau." });
    }
  });

export type ChampFormation =
  | "cycle"
  | "intitule"
  | "filiere"
  | "niveau"
  | "dureeMois"
  | "fraisInscription"
  | "prixTotal"
  | "nbMensualites";

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
  const d = resultat.data;
  const avecNiveaux = aDesNiveaux(d.cycle);
  const filiere = avecNiveaux && d.filiere ? d.filiere : null;

  // Avec niveaux, l'intitulé est construit automatiquement : « Licence Informatique — L2 », « CM1 », « Tle S »
  const intitule = avecNiveaux ? intituleNiveau(d.cycle, d.filiere, d.niveau!) : d.intitule;

  const doublon = avecNiveaux
    ? await db.formation.findFirst({
        where: {
          active: true,
          cycle: d.cycle,
          niveau: d.niveau,
          filiere: filiere ? { equals: filiere, mode: "insensitive" } : null,
        },
      })
    : await db.formation.findFirst({
        where: { active: true, intitule: { equals: intitule, mode: "insensitive" } },
      });
  if (doublon) {
    return avecNiveaux
      ? {
          erreurs: {
            niveau: `Le niveau ${codeNiveau(d.cycle, d.niveau!)} existe déjà${filiere ? " pour cette filière" : ""}.`,
          },
          erreurGenerale: null,
        }
      : { erreurs: { intitule: "Une formation porte déjà ce nom." }, erreurGenerale: null };
  }

  try {
    await db.formation.create({
      data: {
        institutId: institut.id,
        intitule,
        cycle: d.cycle,
        filiere,
        niveau: avecNiveaux ? d.niveau : null,
        dureeMois: d.dureeMois,
        fraisInscription: d.fraisInscription,
        prixTotal: d.prixTotal,
        nbMensualites: d.nbMensualites,
      },
    });
  } catch {
    return {
      erreurs: {},
      erreurGenerale: "L'enregistrement a échoué. Réessayez dans un instant.",
    };
  }

  await flash("Formation créée.");
  revalidatePath("/courses");
  redirect("/courses");
}
