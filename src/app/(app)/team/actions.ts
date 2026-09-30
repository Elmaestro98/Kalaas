"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { exigerRole } from "@/lib/tenant";
import type { DbInstitut } from "@/lib/prisma";

const ROLES = ["DIRECTEUR", "CAISSIER", "FORMATEUR"] as const;

// ─── Inviter un membre ─────────────────────────────

const schemaInvitation = z.object({
  // On retire d'abord les espaces (copier-coller) puis on vérifie le format
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")),
  role: z.enum(ROLES, "Choisissez un rôle."),
  enseignantId: z.string().optional(),
});

export type EtatInvitation = { erreur: string | null; succes: string | null; compteur: number };

export async function inviterMembre(etat: EtatInvitation, formData: FormData): Promise<EtatInvitation> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");
  const echec = (erreur: string): EtatInvitation => ({ erreur, succes: null, compteur: etat.compteur });

  const resultat = schemaInvitation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return echec(resultat.error.issues[0].message);
  }
  const { email, role } = resultat.data;
  const enseignantId = role === "FORMATEUR" && resultat.data.enseignantId ? resultat.data.enseignantId : null;

  // Déjà dans l'équipe ?
  const dejaMembre = await db.membre.findFirst({
    where: { actif: true, utilisateur: { email: { equals: email, mode: "insensitive" } } },
  });
  if (dejaMembre) {
    return echec("Cette personne fait déjà partie de l'équipe.");
  }
  const dejaInvite = await db.invitation.findFirst({ where: { email, statut: "EN_ATTENTE" } });
  if (dejaInvite) {
    return echec("Une invitation est déjà en attente pour cette adresse.");
  }
  if (enseignantId && !(await db.enseignant.findFirst({ where: { id: enseignantId, actif: true } }))) {
    return echec("Fiche professeur introuvable.");
  }

  // Adresse de retour après acceptation (l'application elle-même)
  const entetes = await headers();
  const origine = `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`;

  let clerkInvitationId: string;
  try {
    const clerk = await clerkClient();
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: institut.clerkOrgId,
      emailAddress: email,
      role: "org:member",
      inviterUserId: membre.utilisateur.clerkUserId,
      redirectUrl: `${origine}/dashboard`,
    });
    clerkInvitationId = invitation.id;
  } catch (e) {
    const detail = isClerkAPIResponseError(e) ? e.errors[0]?.longMessage ?? e.errors[0]?.message : null;
    return echec(`L'invitation n'a pas pu être envoyée.${detail ? ` (${detail})` : ""}`);
  }

  await db.invitation.create({
    data: {
      institutId: institut.id,
      email,
      role,
      enseignantId,
      clerkInvitationId,
      inviteParId: membre.utilisateurId,
    },
  });

  revalidatePath("/team");
  return { erreur: null, succes: `Invitation envoyée à ${email}.`, compteur: etat.compteur + 1 };
}

// ─── Annuler une invitation ────────────────────────

export async function revoquerInvitation(formData: FormData): Promise<void> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");

  const invitation = await db.invitation.findFirst({ where: { id, statut: "EN_ATTENTE" } });
  if (!invitation) {
    return;
  }

  if (invitation.clerkInvitationId) {
    try {
      const clerk = await clerkClient();
      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: institut.clerkOrgId,
        invitationId: invitation.clerkInvitationId,
        requestingUserId: membre.utilisateur.clerkUserId,
      });
    } catch {
      // Déjà expirée ou acceptée côté Clerk : on annule quand même chez Kalaas
    }
  }

  await db.invitation.update({ where: { id: invitation.id }, data: { statut: "REVOQUEE" } });
  revalidatePath("/team");
}

// ─── Changer le rôle / l'accès d'un membre ─────────

async function nombreDirecteursActifs(db: DbInstitut) {
  return db.membre.count({ where: { role: "DIRECTEUR", actif: true } });
}

export async function changerRole(formData: FormData): Promise<void> {
  const { membre: moi, db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");
  const role = z.enum(ROLES).safeParse(formData.get("role"));
  if (!role.success || id === moi.id) {
    return; // on ne change jamais son propre rôle (risque de se bloquer)
  }

  const cible = await db.membre.findFirst({ where: { id } });
  if (!cible) {
    return;
  }
  // L'établissement garde toujours au moins un directeur actif
  if (cible.role === "DIRECTEUR" && role.data !== "DIRECTEUR" && (await nombreDirecteursActifs(db)) <= 1) {
    return;
  }

  await db.membre.update({ where: { id: cible.id }, data: { role: role.data } });
  revalidatePath("/team");
}

export async function basculerAcces(formData: FormData): Promise<void> {
  const { membre: moi, db } = await exigerRole("DIRECTEUR");
  const id = String(formData.get("id") ?? "");
  if (id === moi.id) {
    return; // on ne se retire pas son propre accès
  }

  const cible = await db.membre.findFirst({ where: { id } });
  if (!cible) {
    return;
  }
  if (cible.actif && cible.role === "DIRECTEUR" && (await nombreDirecteursActifs(db)) <= 1) {
    return;
  }

  await db.membre.update({ where: { id: cible.id }, data: { actif: !cible.actif } });
  revalidatePath("/team");
}
