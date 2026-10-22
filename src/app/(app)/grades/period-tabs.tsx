import Link from "next/link";

type PeriodTabsProps = {
  periodes: { valeur: number | "ANNEE"; label: string }[];
  active: number | "ANNEE";
  lien: (periode: number | "ANNEE") => string;
  className?: string;
};

// Onglets des périodes d'une école (1er trimestre, 2e trimestre… et éventuellement l'année)
export default function PeriodTabs({ periodes, active, lien, className = "" }: PeriodTabsProps) {
  return (
    <nav aria-label="Période" className={`inline-flex flex-wrap gap-1 rounded-md border border-border bg-surface-200 p-1 ${className}`}>
      {periodes.map((p) => (
        <Link
          key={p.valeur}
          href={lien(p.valeur)}
          aria-current={p.valeur === active ? "page" : undefined}
          className={`flex h-9 items-center rounded-sm px-4 text-sm ${
            p.valeur === active ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
