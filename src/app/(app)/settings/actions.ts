"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

// ─── Années académiques ────────────────────────────

const schemaAnnee = z
  .object({
    libelle: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Format attendu : 2026-2027."),
    dateDebut: z.iso.date("Date de début invalide."),
    dateFin: z.iso.date("Date de fin invalide."),
    enCours: z.string().optional(),
  })
  .refine((d) => d.dateFin > d.dateDebut, {
    message: "La date de fin doit être après la date de début.",
    path: ["dateFin"],
  });

export type ChampAnnee = "libelle" | "dateDebut" | "dateFin";

export type EtatAnnee = {
  erreurs: Partial<Record<ChampAnnee, string>>;
  erreurGenerale: string | null;
  succes: boolean;
};

export async function creerAnneeAcademique(
  _etat: EtatAnnee,
  formData: FormData,
): Promise<EtatAnnee> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaAnnee.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatAnnee["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampAnnee] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null, succes: false };
  }
  const d = resultat.data;

  const existe = await db.anneeAcademique.findFirst({ where: { libelle: d.libelle } });
  if (existe) {
    return { erreurs: { libelle: "Cette année académique existe déjà." }, erreurGenerale: null, succes: false };
  }

  const enCours = d.enCours === "on";
  try {
    await db.$transaction(async (tx) => {
      if (enCours) {
        await tx.anneeAcademique.updateMany({ where: { enCours: true }, data: { enCours: false } });
      }
      await tx.anneeAcademique.create({
        data: {
          institutId: institut.id,
          libelle: d.libelle,
          dateDebut: new Date(d.dateDebut),
          dateFin: new Date(d.dateFin),
          enCours,
        },
      });
    });
  } catch {
    return { erreurs: {}, erreurGenerale: "L'enregistrement a échoué. Réessayez.", succes: false };
  }

  revalidatePath("/settings");
  return { erreurs: {}, erreurGenerale: null, succes: true };
}

export async function definirAnneeEnCours(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const annee = await db.anneeAcademique.findFirst({ where: { id } });
  if (!annee) {
    return;
  }

  await db.$transaction([
    db.anneeAcademique.updateMany({ where: { enCours: true }, data: { enCours: false } }),
    db.anneeAcademique.update({ where: { id: annee.id }, data: { enCours: true } }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/courses");
}

// ─── Préfixe des matricules ────────────────────────

const schemaPrefixe = z.object({
  prefixeMatricule: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "De 2 à 6 lettres ou chiffres, sans espace (ex. ITF)."),
});

export type EtatPrefixe = { erreur: string | null; succes: boolean };

export async function modifierPrefixeMatricule(
  _etat: EtatPrefixe,
  formData: FormData,
): Promise<EtatPrefixe> {
  const { institut } = await exigerRole("DIRECTEUR");

  const resultat = schemaPrefixe.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message, succes: false };
  }

  // Institut n'est pas un modèle « tenant » : on passe par le client brut,
  // en ciblant explicitement l'établissement du contexte.
  await prisma.institut.update({
    where: { id: institut.id },
    data: { prefixeMatricule: resultat.data.prefixeMatricule },
  });

  revalidatePath("/settings");
  return { erreur: null, succes: true };
}

// ─── Salles (emplois du temps) ─────────────────────

const schemaSalle = z.object({
  nom: z.string().trim().min(1, "Indiquez le nom de la salle.").max(40, "40 caractères maximum."),
  capacite: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int("Nombre entier.").min(1, "Au moins 1 place.").max(2000).optional(),
  ),
});

export type EtatSalle = { erreur: string | null; succes: number };

export async function ajouterSalle(etat: EtatSalle, formData: FormData): Promise<EtatSalle> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaSalle.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message, succes: etat.succes };
  }
  const { nom, capacite } = resultat.data;

  const existe = await db.salle.findFirst({ where: { nom: { equals: nom, mode: "insensitive" } } });
  if (existe) {
    if (!existe.active) {
      await db.salle.update({ where: { id: existe.id }, data: { active: true, capacite: capacite ?? existe.capacite } });
      revalidatePath("/settings");
      return { erreur: null, succes: etat.succes + 1 };
    }
    return { erreur: "Une salle porte déjà ce nom.", succes: etat.succes };
  }

  await db.salle.create({ data: { institutId: institut.id, nom, capacite: capacite ?? null } });
  revalidatePath("/settings");
  revalidatePath("/timetable");
  return { erreur: null, succes: etat.succes + 1 };
}

// Une salle n'est jamais supprimée (elle peut figurer dans d'anciens emplois du temps) :
// elle est désactivée et n'est plus proposée.
export async function desactiverSalle(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const salle = await db.salle.findFirst({ where: { id } });
  if (!salle) {
    return;
  }
  await db.salle.update({ where: { id: salle.id }, data: { active: false } });
  revalidatePath("/settings");
  revalidatePath("/timetable");
}
