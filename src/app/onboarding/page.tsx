import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import InstituteForm from "./institute-form";

export default async function OnboardingPage() {
  const { orgId } = await auth.protect();

  if (!orgId) {
    redirect("/");
  }

  const institut = await prisma.institut.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (institut) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">
        Étape 1 sur 3
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Parlons de votre institut</h1>
      <p className="mt-2 mb-8 text-ink-muted">
        Ces informations apparaîtront sur vos reçus. Vous pourrez les modifier plus tard.
      </p>
      <InstituteForm />
    </main>
  );
}
