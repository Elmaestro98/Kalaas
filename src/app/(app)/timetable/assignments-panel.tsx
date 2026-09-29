import Link from "next/link";
import { X } from "lucide-react";
import { supprimerAffectation } from "./assignment-actions";
import AssignmentForm from "./assignment-form";

export type LigneAffectation = {
  id: string;
  matiere: string;
  enseignantId: string;
  enseignant: string;
  volumeHoraire: number | null;
  heuresHebdo: string; // heures programmées dans la semaine type (ex. « 4 h »)
};

type AssignmentsPanelProps = {
  sessionId: string;
  affectations: LigneAffectation[];
  enseignants: { id: string; nom: string }[];
  matieres: string[];
  peutModifier: boolean;
};

export default function AssignmentsPanel({
  sessionId,
  affectations,
  enseignants,
  matieres,
  peutModifier,
}: AssignmentsPanelProps) {
  return (
    <section className="mb-5 rounded-lg border border-border bg-surface-200 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Professeurs de la classe</h2>
        <p className="text-xs text-ink-muted">
          Une matière = un professeur. Il est proposé automatiquement quand vous ajoutez un cours.
        </p>
      </div>

      {affectations.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucune matière affectée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {affectations.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-full border border-border bg-surface-100 py-1 pr-1 pl-3 text-sm"
            >
              <span className="font-semibold">{a.matiere}</span>
              <span className="text-ink-muted">·</span>
              <Link href={`/teachers/${a.enseignantId}`} className="text-ink hover:underline">
                {a.enseignant}
              </Link>
              <span className="rounded-full bg-surface-200 px-2 text-xs text-ink-muted tabular-nums">
                {a.heuresHebdo}/sem.{a.volumeHoraire ? ` · ${a.volumeHoraire} h prévues` : ""}
              </span>
              {peutModifier ? (
                <form action={supprimerAffectation}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label={`Retirer l'affectation ${a.matiere}`}
                    title="Retirer l'affectation"
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <span className="w-1" />
              )}
            </li>
          ))}
        </ul>
      )}

      {peutModifier && (
        <div className="mt-4">
          {enseignants.length === 0 ? (
            <p className="text-sm text-ink-muted">
              <Link href="/teachers/new" className="font-semibold">
                Ajoutez d&apos;abord un professeur →
              </Link>
            </p>
          ) : (
            <AssignmentForm sessionId={sessionId} enseignants={enseignants} matieres={matieres} />
          )}
        </div>
      )}
    </section>
  );
}
