import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { Role } from "@prisma/client";
import { prisma, dbInstitut } from "@/lib/prisma";

export const getContexte = cache(async () => {
  const { userId, orgId } = await auth.protect();

  if (!orgId) {
    redirect("/");
  }

  const institut = await prisma.institut.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!institut) {
    redirect("/onboarding");
  }
  if (institut.statut === "SUSPENDU") {
    throw new Error("Cet institut est suspendu. Contactez le support Kalaas.");
  }

  const membre = await prisma.membre.findFirst({
    where: {
      institutId: institut.id,
      actif: true,
      utilisateur: { clerkUserId: userId },
    },
    include: { utilisateur: true },
  });

  if (!membre) {
    throw new Error("Vous n'avez pas accès à cet institut.");
  }

  return { institut, membre, db: dbInstitut(institut.id) };
});

export async function exigerRole(...roles: Role[]) {
  const ctx = await getContexte();

  if (!roles.includes(ctx.membre.role)) {
    throw new Error("Votre rôle ne permet pas cette action.");
  }

  return ctx;
}
