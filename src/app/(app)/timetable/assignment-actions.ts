"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";

const schemaAffectation = z.object({
  sessionId: z.string().min(1),
  matiere: z.string().trim().min(2, "Indiquez la matière.").max(80, "80 caractères maximum."),
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
  const enseignant = await db.enseignant.findFirst({ where: { id: d.enseignantId, actif: true } });
  if (!enseignant) {
    return { erreur: "Professeur introuvable.", succes: etat.succes };
  }

  // Une matière n'a qu'un professeur par classe : on remplace s'il y en avait déjà un
  const existante = await db.affectation.findFirst({
    where: { sessionId: session.id, matiere: { equals: d.matiere, mode: "insensitive" } },
  });

  if (existante) {
    await db.affectation.update({
      where: { id: existante.id },
      data: { enseignantId: enseignant.id, volumeHoraire: d.volumeHoraire ?? null },
    });
    revalidatePath(`/teachers/${existante.enseignantId}`);
  } else {
    await db.affectation.create({
      data: {
        institutId: institut.id,
        sessionId: session.id,
        enseignantId: enseignant.id,
        matiere: d.matiere,
        volumeHoraire: d.volumeHoraire ?? null,
      },
    });
  }

  revalidatePath("/timetable");
  revalidatePath(`/teachers/${enseignant.id}`);
  return { erreur: null, succes: etat.succes + 1 };
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
