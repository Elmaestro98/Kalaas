"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";

const DECLENCHEURS = ["MANUELLE", "J_MOINS_3", "J_PLUS_1", "J_PLUS_7"] as const;

// ─── Enregistrer une relance (appelée au clic sur « WhatsApp ») ───

const schemaRelance = z.object({
  apprenantId: z.string().min(1),
  declencheur: z.enum(DECLENCHEURS),
  echeanceIds: z.array(z.string().min(1)).min(1).max(60),
  message: z.string().trim().min(1).max(2000),
});

export async function enregistrerRelance(donnees: z.input<typeof schemaRelance>): Promise<void> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaRelance.safeParse(donnees);
  if (!resultat.success) {
    return;
  }
  const d = resultat.data;

  // Les échéances doivent appartenir à cet apprenant et à cet établissement (filtre db)
  const echeances = await db.echeance.findMany({
    where: { id: { in: d.echeanceIds }, inscription: { apprenantId: d.apprenantId } },
    select: { id: true },
  });
  if (echeances.length === 0) {
    return;
  }

  const maintenant = new Date();
  await db.relance.createMany({
    data: echeances.map((e) => ({
      institutId: institut.id,
      echeanceId: e.id,
      auteurId: membre.id,
      canal: "WHATSAPP" as const,
      declencheur: d.declencheur,
      message: d.message,
      statut: "ENVOYEE" as const,
      envoyeeLe: maintenant,
    })),
  });

  revalidatePath("/unpaid");
  revalidatePath(`/students/${d.apprenantId}`);
}

// ─── Modifier un modèle de message ─────────────────

const schemaModele = z.object({
  declencheur: z.enum(DECLENCHEURS),
  contenu: z.string().trim().min(10, "Le message est trop court.").max(1000, "1 000 caractères maximum."),
});

export type EtatModele = { erreur: string | null; succes: boolean };

export async function enregistrerModele(_etat: EtatModele, formData: FormData): Promise<EtatModele> {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const resultat = schemaModele.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message, succes: false };
  }
  const { declencheur, contenu } = resultat.data;

  await db.modeleRelance.upsert({
    where: { institutId_declencheur_canal: { institutId: institut.id, declencheur, canal: "WHATSAPP" } },
    create: { institutId: institut.id, declencheur, canal: "WHATSAPP", contenu },
    update: { contenu, actif: true },
  });

  revalidatePath("/unpaid");
  return { erreur: null, succes: true };
}
