"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
 import type { SidebarProps } from
"@/type/sidebar";
import { NAV_SECTIONS } from "./navigations";

export default function Sidebar({ role, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-62 shrink-0 flex-col bg-navy-900 text-white lg:flex print:hidden">
      <div className="px-6 py-6 text-2xl font-bold">
        Kalaas<span className="text-gold-500">.</span>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 space-y-6 px-3">
        {NAV_SECTIONS.map((section, index) => {
          const items = section.items.filter((item) =>
            item.roles.includes(role),
          );
          if (items.length === 0) {
            return null;
          }

          return (
            <div key={section.title ?? index}>
              {section.title && (
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {section.title}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const actif = pathname.startsWith(item.href);
                  const Icone = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={actif ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 text-sm ${
                          actif
                            ? "border-gold-500 bg-navy-700 font-semibold text-white"
                            : "border-transparent text-white/75 hover:bg-navy-800 hover:text-white"
                        }`}
                      >
                        <Icone size={18} aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-navy-700 px-6 py-4 text-sm text-white/70">
        {footer}
      </div>
    </aside>
  );
}
