import Link from "next/link";
import { X } from "lucide-react";
import { supprimerAffectation } from "./assignment-actions";
import AssignmentForm from "./assignment-form";
import { ETAT_VOLUME, etatVolume } from "@/lib/emploi-du-temps";

export type LigneAffectation = {
  id: string;
  matiere: string;
  enseignantId: string;
  enseignant: string;
  volumeHoraire: number | null;
  heuresHebdo: string; // heures programmées dans la semaine type (ex. « 4 h »)
  heuresProgrammees: number; // heures hebdomadaires × nombre de semaines de la session
};

// « 4 h/sem. · 120 h / 60 h prévues » avec une couleur selon l'écart
function SuiviVolume({ a }: { a: LigneAffectation }) {
  const etat = etatVolume(a.heuresProgrammees, a.volumeHoraire);
  const { label, classe } = ETAT_VOLUME[etat];
  const titre = a.volumeHoraire
    ? `${a.heuresProgrammees} h programmées sur la session pour ${a.volumeHoraire} h prévues${label ? ` : ${label.toLowerCase()}` : ""}`
    : `${a.heuresProgrammees} h programmées sur la session`;

  return (
    <span title={titre} className={`rounded-full px-2 text-xs tabular-nums ${classe}`}>
      {a.heuresHebdo}/sem.
      {a.volumeHoraire ? ` · ${a.heuresProgrammees} / ${a.volumeHoraire} h` : ""}
    </span>
  );
}

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
          Une matière = un professeur, proposé automatiquement quand vous ajoutez un cours. Heures :{" "}
          <span className="text-success">conforme</span> · <span className="text-warning">insuffisant</span> ·{" "}
          <span className="text-danger">dépassement</span>
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
              <SuiviVolume a={a} />
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
