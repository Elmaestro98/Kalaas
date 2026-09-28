
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Home, Menu, Plus, Users, type LucideIcon } from "lucide-react";
import { LienMobile } from "@/type/lienMobile";


const LIENS: (LienMobile | null)[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/students", label: "Apprenants", icon: Users },
  null,
  { href: "/unpaid", label: "Relances", icon: BellRing },
  { href: "/more", label: "Plus", icon: Menu },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-20 grid h-18 grid-cols-5 items-center border-t border-border bg-surface-200 text-[11px] lg:hidden"
      >
        {LIENS.map((lien, index) => {
          if (!lien) {
            return <span key={index} />;
          }

          const actif = pathname.startsWith(lien.href);
          const Icone = lien.icon;

          return (
            <Link
              key={lien.href}
              href={lien.href}
              aria-current={actif ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 ${
                actif ? "font-semibold text-ink" : "text-ink-muted"
              }`}
            >
              <Icone size={22} aria-hidden="true" />
              {lien.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/payments/new"
        aria-label="Nouvel encaissement"
        className="fixed bottom-7 left-1/2 z-30 flex size-15 -translate-x-1/2 items-center justify-center rounded-full border-4 border-surface-100 bg-gold-500 text-navy-900 shadow-lg lg:hidden"
      >
        <Plus size={26} aria-hidden="true" />
      </Link>
    </>
  );
}
