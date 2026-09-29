import type { CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import {
  creneauxDuJour,
  formatHeure,
  joursAffiches,
  type CreneauAffiche,
} from "@/lib/emploi-du-temps";
import { supprimerCreneau } from "./actions";

type WeekGridProps = {
  creneaux: CreneauAffiche[];
  peutModifier: boolean;
};

function Bloc({ c, peutModifier }: { c: CreneauAffiche; peutModifier: boolean }) {
  return (
    <div className="min-w-0 rounded-md border-l-4 border-gold-500 bg-surface-100 p-2.5 text-sm">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold whitespace-nowrap tabular-nums text-gold-700">
          {formatHeure(c.heureDebut)} – {formatHeure(c.heureFin)}
        </p>
        {peutModifier && (
          <form action={supprimerCreneau} className="-mt-1 -mr-1 shrink-0">
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              aria-label={`Supprimer ${c.matiere}`}
              title="Supprimer ce cours"
              className="flex size-6 cursor-pointer items-center justify-center rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
      <p className="mt-0.5 font-semibold leading-snug break-words">{c.matiere}</p>
      {c.details.map((d) => (
        <p key={d} className="truncate text-xs text-ink-muted" title={d}>
          {d}
        </p>
      ))}
    </div>
  );
}

export default function WeekGrid({ creneaux, peutModifier }: WeekGridProps) {
  const jours = joursAffiches(creneaux);

  return (
    // Sur écran étroit, la grille défile horizontalement dans son cadre au lieu de déborder
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div
        className="grid gap-3 md:grid-cols-[repeat(var(--nb-jours),minmax(10rem,1fr))]"
        style={{ "--nb-jours": jours.length } as CSSProperties}
      >
        {jours.map((j) => {
          const cours = creneauxDuJour(creneaux, j.valeur);
          return (
            <section key={j.valeur} className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface-200">
              <h3 className="flex items-baseline justify-between bg-navy-900 px-3 py-2 text-sm font-semibold text-white">
                {j.label}
                {cours.length > 0 && (
                  <span className="text-xs font-normal text-white/60">{cours.length} cours</span>
                )}
              </h3>
              <div className="space-y-2 p-2">
                {cours.length === 0 ? (
                  <p className="py-3 text-center text-xs text-ink-muted">Pas de cours</p>
                ) : (
                  cours.map((c) => <Bloc key={c.id} c={c} peutModifier={peutModifier} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
