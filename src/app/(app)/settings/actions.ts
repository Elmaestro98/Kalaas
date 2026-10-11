"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { flash } from "@/lib/flash";
import { exigerRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { normaliserTelephone } from "@/lib/telephone";

// ─── Informations de l'établissement (en-tête des reçus et documents) ───

const telephoneValide = (v: string) => v === "" || normaliserTelephone(v) !== null;

const schemaEtablissement = z.object({
  nom: z.string().trim().min(2, "Le nom de l'établissement est obligatoire.").max(120, "120 caractères maximum."),
  ville: z.string().trim().min(2, "La ville est obligatoire.").max(80, "80 caractères maximum."),
  adresse: z.string().trim().max(200, "200 caractères maximum."),
  telephone: z
    .string()
    .trim()
    .refine((v) => normaliserTelephone(v) !== null, "Numéro invalide (ex. 77 123 45 67)."),
  telephone2: z.string().trim().refine(telephoneValide, "Numéro invalide (ex. 33 800 00 00)."),
  ninea: z.string().trim().max(30, "30 caractères maximum."),
  rccm: z.string().trim().max(50, "50 caractères maximum."),
  piedRecu: z.string().trim().max(200, "200 caractères maximum."),
});

export type ChampEtablissement = keyof z.infer<typeof schemaEtablissement>;
export type EtatEtablissement = { erreurs: Partial<Record<ChampEtablissement, string>>; erreurGenerale: string | null };

export async function modifierEtablissement(_etat: EtatEtablissement, formData: FormData): Promise<EtatEtablissement> {
  const { institut, membre } = await exigerRole("DIRECTEUR");

  const resultat = schemaEtablissement.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatEtablissement["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) erreurs[champ as ChampEtablissement] = messages[0];
    }
    return { erreurs, erreurGenerale: null };
  }
  const d = resultat.data;

  const donnees = {
    nom: d.nom,
    ville: d.ville,
    adresse: d.adresse || null,
    telephone: normaliserTelephone(d.telephone),
    telephone2: d.telephone2 ? normaliserTelephone(d.telephone2) : null,
    ninea: d.ninea || null,
    rccm: d.rccm || null,
    piedRecu: d.piedRecu || null,
  };
  const avant = {
    nom: institut.nom,
    ville: institut.ville,
    adresse: institut.adresse,
    telephone: institut.telephone,
    telephone2: institut.telephone2,
    ninea: institut.ninea,
    rccm: institut.rccm,
    piedRecu: institut.piedRecu,
  };

  // Institut n'est pas un modèle « tenant » : client brut, établissement du contexte ciblé explicitement
  await prisma.$transaction([
    prisma.institut.update({ where: { id: institut.id }, data: donnees }),
    prisma.journalAudit.create({
      data: {
        institutId: institut.id,
        auteurId: membre.utilisateurId,
        action: "ETABLISSEMENT_MODIFIE",
        entite: "Institut",
        entiteId: institut.id,
        avant,
        apres: donnees,
      },
    }),
  ]);

  // Le même nom dans le sélecteur d'établissement (organisation Clerk) : sans effet bloquant si Clerk échoue
  if (d.nom !== institut.nom) {
    try {
      const clerk = await clerkClient();
      await clerk.organizations.updateOrganization(institut.clerkOrgId, { name: d.nom });
    } catch {
      // Le nom reste correct sur les documents ; le sélecteur sera mis à jour au prochain essai
    }
  }

  await flash("Informations de l'établissement enregistrées.");
  revalidatePath("/", "layout");
  return { erreurs: {}, erreurGenerale: null };
}

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

  await flash("Année académique créée.");
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

  await flash(`${annee.libelle} est maintenant l'année en cours.`);
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

  await flash("Préfixe des matricules enregistré.");
  revalidatePath("/settings");
  return { erreur: null, succes: true };
}

// ─── Plafond des dépenses saisies par un caissier ───

export type EtatPlafond = { erreur: string | null; succes: boolean };

export async function modifierPlafondDepense(_etat: EtatPlafond, formData: FormData): Promise<EtatPlafond> {
  const { institut, membre } = await exigerRole("DIRECTEUR");

  // « aucune » = pas de limite ; sinon un montant (0 = le caissier ne peut pas saisir de dépense)
  const regle = String(formData.get("regle") ?? "");
  let plafond: number | null = null;
  if (regle === "plafond") {
    const montant = Number(formData.get("montant"));
    if (!Number.isInteger(montant) || montant < 0 || montant > 100_000_000) {
      return { erreur: "Montant invalide.", succes: false };
    }
    plafond = montant;
  } else if (regle === "interdit") {
    plafond = 0;
  } else if (regle !== "aucune") {
    return { erreur: "Choisissez une règle.", succes: false };
  }

  // Institut n'est pas un modèle « tenant » : client brut, établissement du contexte ciblé explicitement
  await prisma.$transaction([
    prisma.institut.update({ where: { id: institut.id }, data: { plafondDepenseCaissier: plafond } }),
    prisma.journalAudit.create({
      data: {
        institutId: institut.id,
        auteurId: membre.utilisateurId,
        action: "PLAFOND_DEPENSE_MODIFIE",
        entite: "Institut",
        entiteId: institut.id,
        avant: { plafondDepenseCaissier: institut.plafondDepenseCaissier },
        apres: { plafondDepenseCaissier: plafond },
      },
    }),
  ]);

  revalidatePath("/settings");
  await flash("Règle des dépenses enregistrée.");
  revalidatePath("/expenses/new");
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
  await flash(`Salle « ${nom} » ajoutée.`);
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
  await flash(`Salle « ${salle.nom} » désactivée.`);
  revalidatePath("/settings");
  revalidatePath("/timetable");
}
