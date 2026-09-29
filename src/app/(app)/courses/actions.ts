"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { CYCLES, codeNiveau, estLmd, intituleLmd } from "@/lib/lmd";

const MONTANT_MAX = 100_000_000;

const schemaFormation = z
  .object({
    cycle: z.enum(["FORMATION_COURTE", "LICENCE", "MASTER", "DOCTORAT"], "Choisissez le type de formation."),
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
    if (!estLmd(d.cycle)) {
      if (d.intitule.length < 2) {
        ctx.addIssue({ code: "custom", path: ["intitule"], message: "Indiquez l'intitulé de la formation." });
      }
      return;
    }
    if (d.filiere.length < 2) {
      ctx.addIssue({ code: "custom", path: ["filiere"], message: "Indiquez la filière (ex. Informatique de gestion)." });
    }
    const max = CYCLES[d.cycle].nbNiveaux;
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
  const lmd = estLmd(d.cycle);

  // En LMD, l'intitulé est construit automatiquement : « Licence Informatique — L2 »
  const intitule = lmd ? intituleLmd(d.cycle, d.filiere, d.niveau!) : d.intitule;

  const doublon = lmd
    ? await db.formation.findFirst({
        where: {
          active: true,
          cycle: d.cycle,
          niveau: d.niveau,
          filiere: { equals: d.filiere, mode: "insensitive" },
        },
      })
    : await db.formation.findFirst({
        where: { active: true, intitule: { equals: intitule, mode: "insensitive" } },
      });
  if (doublon) {
    return lmd
      ? {
          erreurs: { niveau: `Le niveau ${codeNiveau(d.cycle, d.niveau!)} de cette filière existe déjà.` },
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
        filiere: lmd ? d.filiere : null,
        niveau: lmd ? d.niveau : null,
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

  revalidatePath("/courses");
  redirect("/courses");
}
