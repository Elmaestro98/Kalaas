"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { normaliserTelephone } from "@/lib/telephone";

const schemaEnseignant = z
  .object({
    id: z.string().optional(),
    prenom: z.string().trim().min(1, "Indiquez le prénom.").max(60, "60 caractères maximum."),
    nom: z.string().trim().min(1, "Indiquez le nom.").max(60, "60 caractères maximum."),
    telephone: z.string().trim(),
    email: z.string().trim().max(120, "120 caractères maximum."),
    specialite: z.string().trim().max(80, "80 caractères maximum."),
    statut: z.enum(["PERMANENT", "VACATAIRE"], "Choisissez le statut."),
    tarifHoraire: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.coerce.number().int("Montant sans virgule.").min(0).max(1_000_000, "Montant trop élevé.").optional(),
    ),
    membreId: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.telephone && normaliserTelephone(d.telephone) === null) {
      ctx.addIssue({ code: "custom", path: ["telephone"], message: "Numéro invalide (ex. 77 123 45 67)." });
    }
    if (d.email && !z.email().safeParse(d.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Adresse e-mail invalide." });
    }
  });

export type ChampEnseignant =
  | "prenom"
  | "nom"
  | "telephone"
  | "email"
  | "specialite"
  | "statut"
  | "tarifHoraire"
  | "membreId";

export type EtatEnseignant = {
  erreurs: Partial<Record<ChampEnseignant, string>>;
  erreurGenerale: string | null;
  succes: boolean;
};

// Crée (sans id) ou modifie (avec id) une fiche professeur
export async function enregistrerEnseignant(
  _etat: EtatEnseignant,
  formData: FormData,
): Promise<EtatEnseignant> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaEnseignant.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatEnseignant["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampEnseignant] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null, succes: false };
  }
  const d = resultat.data;

  // Compte Kalaas facultatif : il doit appartenir à l'établissement
  if (d.membreId && !(await db.membre.findFirst({ where: { id: d.membreId, actif: true } }))) {
    return { erreurs: { membreId: "Compte introuvable." }, erreurGenerale: null, succes: false };
  }

  const donnees = {
    prenom: d.prenom,
    nom: d.nom,
    telephone: d.telephone ? normaliserTelephone(d.telephone) : null,
    email: d.email || null,
    specialite: d.specialite || null,
    statut: d.statut,
    tarifHoraire: d.tarifHoraire ?? null,
    membreId: d.membreId || null,
  };

  let id = d.id;
  try {
    if (id) {
      const existant = await db.enseignant.findFirst({ where: { id } });
      if (!existant) {
        return { erreurs: {}, erreurGenerale: "Professeur introuvable.", succes: false };
      }
      await db.enseignant.update({ where: { id: existant.id }, data: donnees });
    } else {
      const cree = await db.enseignant.create({ data: { institutId: institut.id, ...donnees } });
      id = cree.id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        erreurs: { membreId: "Ce compte est déjà relié à une autre fiche professeur." },
        erreurGenerale: null,
        succes: false,
      };
    }
    return { erreurs: {}, erreurGenerale: "L'enregistrement a échoué. Réessayez.", succes: false };
  }

  revalidatePath("/teachers");
  revalidatePath("/timetable");
  if (!d.id) {
    redirect(`/teachers/${id}`);
  }
  revalidatePath(`/teachers/${id}`);
  return { erreurs: {}, erreurGenerale: null, succes: true };
}

// Un professeur n'est jamais supprimé (il figure dans des emplois du temps passés) :
// il est désactivé et n'est plus proposé.
export async function basculerActifEnseignant(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const enseignant = await db.enseignant.findFirst({ where: { id } });
  if (!enseignant) {
    return;
  }
  await db.enseignant.update({ where: { id: enseignant.id }, data: { actif: !enseignant.actif } });

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${enseignant.id}`);
  revalidatePath("/timetable");
}
