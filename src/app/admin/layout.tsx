import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { exigerSuperAdmin } from "@/lib/tenant";
import Logo from "@/components/logo";

export const metadata = { title: "Administration · Kalaas", robots: { index: false } };

// Espace du propriétaire de Kalaas : tous les établissements, hors de tout établissement
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await exigerSuperAdmin();

  return (
    <div className="min-h-screen bg-surface-100">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-navy-900 px-4 text-white lg:px-8">
        <Logo variante="clair" taille={28} />
        <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase sm:inline">
          Administration
        </span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-sm text-white/75 hover:text-white">
          Retour à mon établissement
        </Link>
        <UserButton />
      </header>
      <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
