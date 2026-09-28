
import type { ReactNode } from "react";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { getContexte } from "@/lib/tenant";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { ROLE_LABELS } from "@/components/navigations";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { membre } = await getContexte();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={membre.role}
        footer={`${membre.utilisateur.nom} · ${ROLE_LABELS[membre.role]}`}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-surface-200 px-4 lg:h-18 lg:px-8">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
          <div className="flex-1" />
          <Link
            href="/payments/new"
            className="hidden h-11 items-center rounded-md bg-gold-500 px-5 font-medium text-navy-900 hover:opacity-90 lg:flex"
          >
            + Nouvel encaissement
          </Link>
          <UserButton />
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:py-8">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
