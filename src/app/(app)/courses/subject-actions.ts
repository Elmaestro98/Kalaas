"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";

const entierFacultatif = (max: number, message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int("Nombre entier.").min(0).max(max, message).optional(),
  );

const schemaMatiere = z.object({
  id: z.string().optional(),
  formationId: z.string().min(1),
  intitule: z.string().trim().min(2, "Indiquez l'intitulé de la matière.").max(80, "80 caractères maximum."),
  code: z.string().trim().max(20, "20 caractères maximum."),
  volumeHoraire: entierFacultatif(2000, "2 000 heures maximum."),
  heuresCM: entierFacultatif(2000, "Trop d'heures."),
  heuresTD: entierFacultatif(2000, "Trop d'heures."),
  heuresTP: entierFacultatif(2000, "Trop d'heures."),
  coefficient: entierFacultatif(20, "20 maximum."),
  credits: entierFacultatif(60, "60 crédits maximum."),
  semestre: entierFacultatif(12, "Semestre invalide."),
  ueId: z.string().optional(),
  enseignantHabituelId: z.string(),
});

export type EtatMatiere = { erreur: string | null; succes: number };

// Crée (sans id) ou modifie (avec id) une matière du programme d'une formation
export async function enregistrerMatiere(etat: EtatMatiere, formData: FormData): Promise<EtatMatiere> {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const echec = (erreur: string): EtatMatiere => ({ erreur, succes: etat.succes });

  const resultat = schemaMatiere.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return echec(resultat.error.issues[0].message);
  }
  const d = resultat.data;

  const formation = await db.formation.findFirst({ where: { id: d.formationId } });
  if (!formation) {
    return echec("Formation introuvable.");
  }
  // L'UE doit appartenir à la même formation
  if (d.ueId && !(await db.uniteEnseignement.findFirst({ where: { id: d.ueId, formationId: formation.id } }))) {
    return echec("Unité d'enseignement introuvable.");
  }
  if (d.enseignantHabituelId && !(await db.enseignant.findFirst({ where: { id: d.enseignantHabituelId } }))) {
    return echec("Professeur introuvable.");
  }

  // Le volume total, s'il n'est pas saisi, est la somme CM + TD + TP
  const somme = (d.heuresCM ?? 0) + (d.heuresTD ?? 0) + (d.heuresTP ?? 0);
  const donnees = {
    intitule: d.intitule,
    code: d.code || null,
    volumeHoraire: d.volumeHoraire ?? (somme > 0 ? somme : null),
    heuresCM: d.heuresCM ?? null,
    heuresTD: d.heuresTD ?? null,
    heuresTP: d.heuresTP ?? null,
    coefficient: d.coefficient ?? null,
    credits: d.credits ?? null,
    semestre: d.semestre ?? null,
    ueId: d.ueId || null,
    enseignantHabituelId: d.enseignantHabituelId || null,
  };

  try {
    if (d.id) {
      const existante = await db.matiere.findFirst({ where: { id: d.id, formationId: formation.id } });
      if (!existante) {
        return echec("Matière introuvable.");
      }
      await db.matiere.update({ where: { id: existante.id }, data: donnees });
      // L'intitulé recopié dans les cours et affectations suit le nouveau nom
      if (existante.intitule !== d.intitule) {
        await db.creneau.updateMany({ where: { matiereId: existante.id }, data: { matiere: d.intitule } });
        await db.affectation.updateMany({ where: { matiereId: existante.id }, data: { matiere: d.intitule } });
      }
    } else {
      const derniere = await db.matiere.findFirst({
        where: { formationId: formation.id },
        orderBy: { ordre: "desc" },
        select: { ordre: true },
      });
      await db.matiere.create({
        data: { institutId: institut.id, formationId: formation.id, ordre: (derniere?.ordre ?? 0) + 1, ...donnees },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return echec("Cette formation a déjà une matière avec cet intitulé.");
    }
    return echec("L'enregistrement a échoué. Réessayez.");
  }

  revalidatePath(`/courses/${formation.id}`);
  revalidatePath("/courses");
  revalidatePath("/timetable");
  return { erreur: null, succes: etat.succes + 1 };
}

// Une matière n'est jamais supprimée (historique des cours et appels) : elle est désactivée
export async function basculerMatiere(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const matiere = await db.matiere.findFirst({ where: { id } });
  if (!matiere) {
    return;
  }
  await db.matiere.update({ where: { id: matiere.id }, data: { active: !matiere.active } });
  revalidatePath(`/courses/${matiere.formationId}`);
  revalidatePath("/timetable");
}

// Ajout rapide depuis l'emploi du temps (« + Nouvelle matière »)
export async function creerMatiereRapide(donnees: {
  formationId: string;
  intitule: string;
}): Promise<{ erreur: string | null; matiere: { id: string; intitule: string } | null }> {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const intitule = String(donnees.intitule ?? "").trim().slice(0, 80);
  if (intitule.length < 2) {
    return { erreur: "Intitulé trop court.", matiere: null };
  }

  const formation = await db.formation.findFirst({ where: { id: String(donnees.formationId ?? "") } });
  if (!formation) {
    return { erreur: "Formation introuvable.", matiere: null };
  }

  const existante = await db.matiere.findFirst({
    where: { formationId: formation.id, intitule: { equals: intitule, mode: "insensitive" } },
  });
  if (existante) {
    if (!existante.active) {
      await db.matiere.update({ where: { id: existante.id }, data: { active: true } });
    }
    return { erreur: null, matiere: { id: existante.id, intitule: existante.intitule } };
  }

  const creee = await db.matiere.create({
    data: { institutId: institut.id, formationId: formation.id, intitule, ordre: 999 },
  });
  revalidatePath(`/courses/${formation.id}`);
  return { erreur: null, matiere: { id: creee.id, intitule: creee.intitule } };
}

// ─── Unités d'enseignement (UE) ────────────────────

const schemaUE = z.object({
  id: z.string().optional(),
  formationId: z.string().min(1),
  code: z.string().trim().max(20, "20 caractères maximum."),
  intitule: z.string().trim().min(2, "Indiquez l'intitulé de l'UE.").max(80, "80 caractères maximum."),
  semestre: entierFacultatif(12, "Semestre invalide."),
  credits: entierFacultatif(60, "60 crédits maximum."),
});

export type EtatUE = { erreur: string | null; succes: number };

// Crée (sans id) ou modifie (avec id) une UE de la formation
export async function enregistrerUE(etat: EtatUE, formData: FormData): Promise<EtatUE> {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const echec = (erreur: string): EtatUE => ({ erreur, succes: etat.succes });

  const resultat = schemaUE.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return echec(resultat.error.issues[0].message);
  }
  const d = resultat.data;

  const formation = await db.formation.findFirst({ where: { id: d.formationId } });
  if (!formation) {
    return echec("Formation introuvable.");
  }

  const donnees = {
    code: d.code || null,
    intitule: d.intitule,
    semestre: d.semestre ?? null,
    credits: d.credits ?? null,
  };

  try {
    if (d.id) {
      const existante = await db.uniteEnseignement.findFirst({ where: { id: d.id, formationId: formation.id } });
      if (!existante) {
        return echec("UE introuvable.");
      }
      await db.uniteEnseignement.update({ where: { id: existante.id }, data: donnees });
    } else {
      await db.uniteEnseignement.create({ data: { institutId: institut.id, formationId: formation.id, ...donnees } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return echec("Cette formation a déjà une UE avec cet intitulé.");
    }
    return echec("L'enregistrement a échoué. Réessayez.");
  }

  revalidatePath(`/courses/${formation.id}`);
  revalidatePath("/grades");
  return { erreur: null, succes: etat.succes + 1 };
}

// Une UE désactivée n'est plus proposée ; ses matières restent (sans UE si besoin)
export async function basculerUE(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const ue = await db.uniteEnseignement.findFirst({ where: { id } });
  if (!ue) {
    return;
  }
  await db.uniteEnseignement.update({ where: { id: ue.id }, data: { active: !ue.active } });
  revalidatePath(`/courses/${ue.formationId}`);
  revalidatePath("/grades");
}
