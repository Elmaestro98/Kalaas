
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const schemaInstitut = z.object({
  nom: z.string().trim().min(2, "Le nom de l'institut est obligatoire."),
  ville: z.string().trim().min(2, "La ville est obligatoire."),
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9 ]{9,12}$/, "Numéro WhatsApp invalide (ex. 77 123 45 67)."),
  adresse: z.string().trim().max(200),
  ninea: z.string().trim().max(30),
  rccm: z.string().trim().max(50),
});

export type EtatFormulaire = { erreur: string | null };

export async function creerInstitut(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const { userId, orgId, orgRole } = await auth.protect();

  if (!orgId) {
    return { erreur: "Créez ou choisissez d'abord une organisation." };
  }
  if (orgRole !== "org:admin") {
    return { erreur: "Seul l'administrateur de l'organisation peut configurer l'institut." };
  }

  const resultat = schemaInstitut.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message };
  }
  const donnees = resultat.data;

  const dejaCree = await prisma.institut.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (dejaCree) {
    redirect("/dashboard");
  }

  const utilisateurClerk = await currentUser();
  if (!utilisateurClerk) {
    return { erreur: "Votre session a expiré. Reconnectez-vous." };
  }
  const email = utilisateurClerk.primaryEmailAddress?.emailAddress ?? "";
  const nomComplet = utilisateurClerk.fullName ?? email;

  const debut = new Date();
  const finEssai = new Date(debut);
  finEssai.setDate(finEssai.getDate() + 14);

  await prisma.$transaction(async (tx) => {
    const institut = await tx.institut.create({
      data: {
        clerkOrgId: orgId,
        nom: donnees.nom,
        ville: donnees.ville,
        telephone: `+221 ${donnees.telephone}`,
        adresse: donnees.adresse || null,
        ninea: donnees.ninea || null,
        rccm: donnees.rccm || null,
      },
    });

    const utilisateur = await tx.utilisateur.upsert({
      where: { clerkUserId: userId },
      update: { email, nom: nomComplet },
      create: { clerkUserId: userId, email, nom: nomComplet },
    });

    await tx.membre.create({
      data: {
        institutId: institut.id,
        utilisateurId: utilisateur.id,
        role: "DIRECTEUR",
      },
    });

    await tx.abonnement.create({
      data: {
        institutId: institut.id,
        offre: "PRO",
        statut: "ESSAI",
        debut,
        fin: finEssai,
      },
    });
  });

  redirect("/dashboard");
}