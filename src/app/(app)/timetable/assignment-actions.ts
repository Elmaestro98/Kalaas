"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";
import type { DbInstitut } from "@/lib/prisma";

const schemaAffectation = z.object({
  sessionId: z.string().min(1),
  matiereId: z.string().min(1, "Choisissez la matière."),
  enseignantId: z.string().min(1, "Choisissez le professeur."),
  volumeHoraire: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int("Nombre d'heures entier.").min(1, "Au moins 1 heure.").max(2000).optional(),
  ),
});

export type EtatAffectation = {
  erreur: string | null;
  succes: number;
};

export async function enregistrerAffectation(
  etat: EtatAffectation,
  formData: FormData,
): Promise<EtatAffectation> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaAffectation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message, succes: etat.succes };
  }
  const d = resultat.data;

  const session = await db.session.findFirst({ where: { id: d.sessionId } });
  if (!session) {
    return { erreur: "Classe introuvable.", succes: etat.succes };
  }
  // La matière doit faire partie du programme de la formation de cette classe
  const matiere = await db.matiere.findFirst({
    where: { id: d.matiereId, formationId: session.formationId, active: true },
  });
  if (!matiere) {
    return { erreur: "Cette matière ne fait pas partie du programme de la formation.", succes: etat.succes };
  }
  const enseignant = await db.enseignant.findFirst({ where: { id: d.enseignantId, actif: true } });
  if (!enseignant) {
    return { erreur: "Professeur introuvable.", succes: etat.succes };
  }

  await affecter(db, institut.id, session.id, matiere, enseignant.id, d.volumeHoraire ?? matiere.volumeHoraire);

  revalidatePath("/timetable");
  revalidatePath(`/teachers/${enseignant.id}`);
  return { erreur: null, succes: etat.succes + 1 };
}

// Crée ou remplace l'affectation d'une matière dans une classe (une matière = un professeur)
async function affecter(
  db: DbInstitut,
  institutId: string,
  sessionId: string,
  matiere: { id: string; intitule: string },
  enseignantId: string,
  volumeHoraire: number | null,
) {
  const existante = await db.affectation.findFirst({
    where: {
      sessionId,
      OR: [{ matiereId: matiere.id }, { matiere: { equals: matiere.intitule, mode: "insensitive" } }],
    },
  });
  if (existante) {
    await db.affectation.update({
      where: { id: existante.id },
      data: { enseignantId, volumeHoraire, matiereId: matiere.id, matiere: matiere.intitule },
    });
    revalidatePath(`/teachers/${existante.enseignantId}`);
  } else {
    await db.affectation.create({
      data: { institutId, sessionId, enseignantId, matiereId: matiere.id, matiere: matiere.intitule, volumeHoraire },
    });
  }
}

// « Reprendre le programme » : affecte d'un coup chaque matière non encore affectée
// à son professeur habituel, avec le volume horaire prévu au programme
export async function appliquerProgramme(formData: FormData): Promise<void> {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const sessionId = String(formData.get("sessionId") ?? "");

  const session = await db.session.findFirst({ where: { id: sessionId } });
  if (!session) {
    return;
  }

  const [matieres, dejaAffectees] = await Promise.all([
    db.matiere.findMany({
      where: { formationId: session.formationId, active: true, enseignantHabituelId: { not: null } },
      include: { enseignantHabituel: { select: { actif: true } } },
    }),
    db.affectation.findMany({ where: { sessionId: session.id }, select: { matiereId: true } }),
  ]);
  const affectees = new Set(dejaAffectees.map((a) => a.matiereId));

  for (const m of matieres) {
    if (affectees.has(m.id) || !m.enseignantHabituelId || !m.enseignantHabituel?.actif) continue;
    await affecter(db, institut.id, session.id, m, m.enseignantHabituelId, m.volumeHoraire);
  }

  revalidatePath("/timetable");
}

export async function supprimerAffectation(formData: FormData): Promise<void> {
  const { db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const affectation = await db.affectation.findFirst({ where: { id } });
  if (!affectation) {
    return;
  }
  await db.affectation.delete({ where: { id: affectation.id } });

  revalidatePath("/timetable");
  revalidatePath(`/teachers/${affectation.enseignantId}`);
}
