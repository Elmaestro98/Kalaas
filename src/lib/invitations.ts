import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Appelée par getContexte() quand une personne connectée à l'organisation Clerk
// n'a pas encore d'accès Kalaas : si une invitation en attente correspond à l'un
// de ses e-mails, on crée son accès avec le rôle prévu (sans webhook).
export async function accepterInvitation(institutId: string, clerkUserId: string) {
  const utilisateurClerk = await currentUser();
  if (!utilisateurClerk) {
    return null;
  }

  const emails = utilisateurClerk.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  if (emails.length === 0) {
    return null;
  }

  // Client brut, mais toujours ciblé sur l'établissement du contexte
  const invitation = await prisma.invitation.findFirst({
    where: { institutId, statut: "EN_ATTENTE", email: { in: emails } },
    orderBy: { createdAt: "desc" },
  });
  if (!invitation) {
    // L'invitation vient peut-être d'être acceptée par un chargement simultané
    return relireMembre(institutId, clerkUserId);
  }

  const email = utilisateurClerk.primaryEmailAddress?.emailAddress ?? emails[0];
  const nom =
    utilisateurClerk.fullName ||
    [utilisateurClerk.firstName, utilisateurClerk.lastName].filter(Boolean).join(" ") ||
    email;

  try {
    return await creerAcces(invitation, institutId, clerkUserId, email, nom);
  } catch (e) {
    // Course : un autre chargement simultané de la page vient de créer l'accès
    // (même utilisateur, contrainte unique). On relit simplement cet accès.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return relireMembre(institutId, clerkUserId);
    }
    throw e;
  }
}

function relireMembre(institutId: string, clerkUserId: string) {
  return prisma.membre.findFirst({
    where: { institutId, actif: true, utilisateur: { clerkUserId } },
    include: { utilisateur: true },
  });
}

function creerAcces(
  invitation: { id: string; role: Role; enseignantId: string | null },
  institutId: string,
  clerkUserId: string,
  email: string,
  nom: string,
) {
  return prisma.$transaction(async (tx) => {
    const utilisateur = await tx.utilisateur.upsert({
      where: { clerkUserId },
      update: {},
      create: { clerkUserId, email, nom },
    });

    // Déjà membre (par exemple désactivé puis réinvité) : on réactive avec le nouveau rôle
    const membre = await tx.membre.upsert({
      where: { institutId_utilisateurId: { institutId, utilisateurId: utilisateur.id } },
      update: { role: invitation.role, actif: true },
      create: { institutId, utilisateurId: utilisateur.id, role: invitation.role },
    });

    // Formateur : son compte est relié à sa fiche professeur (si elle n'a pas déjà de compte)
    if (invitation.enseignantId) {
      await tx.enseignant.updateMany({
        where: { id: invitation.enseignantId, institutId, membreId: null },
        data: { membreId: membre.id },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { statut: "ACCEPTEE", accepteeLe: new Date() },
    });

    await tx.journalAudit.create({
      data: {
        institutId,
        auteurId: utilisateur.id,
        action: "INVITATION_ACCEPTEE",
        entite: "Membre",
        entiteId: membre.id,
        apres: { email, role: invitation.role },
      },
    });

    return tx.membre.findUniqueOrThrow({
      where: { id: membre.id },
      include: { utilisateur: true },
    });
  });
}
