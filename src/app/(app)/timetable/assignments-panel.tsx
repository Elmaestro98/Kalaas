import Link from "next/link";
import { Wand2, X } from "lucide-react";
import { appliquerProgramme, supprimerAffectation } from "./assignment-actions";
import AssignmentForm from "./assignment-form";
import { ETAT_VOLUME, etatVolume } from "@/lib/emploi-du-temps";

export type LigneAffectation = {
  id: string;
  matiere: string;
  matiereId: string | null;
  enseignantId: string;
  enseignant: string;
  volumeHoraire: number | null;
  heuresHebdo: string; // heures programmées dans la semaine type (ex. « 4 h »)
  heuresProgrammees: number; // heures hebdomadaires × nombre de semaines de la session
  heuresRealisees: number; // heures des cours dont l'appel a été fait
};

type MatiereProgramme = { id: string; intitule: string; volumeHoraire: number | null; enseignantHabituelId: string | null };

type AssignmentsPanelProps = {
  sessionId: string;
  formationId: string;
  affectations: LigneAffectation[];
  enseignants: { id: string; nom: string }[];
  programme: MatiereProgramme[];
  nonAffectees: { id: string; intitule: string; habituel: string | null }[];
  peutModifier: boolean;
};

// Prévu · programmé · réalisé, avec une barre de progression des heures réalisées
function SuiviVolume({ a }: { a: LigneAffectation }) {
  const etat = etatVolume(a.heuresProgrammees, a.volumeHoraire);
  const reference = a.volumeHoraire ?? a.heuresProgrammees;
  const pourcentage = reference > 0 ? Math.min(100, Math.round((a.heuresRealisees / reference) * 100)) : 0;

  return (
    <div className="w-full space-y-1 text-xs sm:w-60">
      <p className="flex flex-wrap gap-x-2 text-ink-muted tabular-nums">
        <span>{a.heuresHebdo}/sem.</span>
        {a.volumeHoraire && <span>· prévu {a.volumeHoraire} h</span>}
        <span className={`rounded-full px-1.5 ${ETAT_VOLUME[etat].classe}`}>programmé {a.heuresProgrammees} h</span>
      </p>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-surface-100">
          <div className="h-1.5 rounded-full bg-success" style={{ width: `${pourcentage}%` }} />
        </div>
        <span className="font-semibold tabular-nums text-success">réalisé {a.heuresRealisees} h</span>
      </div>
    </div>
  );
}

export default function AssignmentsPanel({
  sessionId,
  formationId,
  affectations,
  enseignants,
  programme,
  nonAffectees,
  peutModifier,
}: AssignmentsPanelProps) {
  const reprenables = nonAffectees.filter((m) => m.habituel);

  return (
    <section className="mb-5 rounded-lg border border-border bg-surface-200 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Matières et professeurs de la classe</h2>
        <Link href={`/courses/${formationId}`} className="text-xs font-semibold">
          Programme de la formation →
        </Link>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Réalisé = heures des cours dont l&apos;appel a été fait. Programmé :{" "}
        <span className="text-success">conforme</span> · <span className="text-warning">insuffisant</span> ·{" "}
        <span className="text-danger">dépassement</span> par rapport au prévu.
      </p>

      {affectations.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucune matière affectée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {affectations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{a.matiere}</p>
                <Link href={`/teachers/${a.enseignantId}`} className="text-sm text-ink hover:underline">
                  {a.enseignant}
                </Link>
              </div>
              <SuiviVolume a={a} />
              {peutModifier && (
                <form action={supprimerAffectation}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label={`Retirer l'affectation ${a.matiere}`}
                    title="Retirer l'affectation"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {nonAffectees.length > 0 && (
        <div className="mt-3 rounded-md bg-warning-soft px-4 py-3 text-sm">
          <p className="font-medium text-warning">
            Sans professeur : {nonAffectees.map((m) => m.intitule).join(", ")}
          </p>
          {peutModifier && reprenables.length > 0 && (
            <form action={appliquerProgramme} className="mt-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-surface-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-100"
              >
                <Wand2 size={16} aria-hidden="true" />
                Reprendre le programme ({reprenables.map((m) => `${m.intitule} → ${m.habituel}`).join(", ")})
              </button>
            </form>
          )}
        </div>
      )}

      {peutModifier && (
        <div className="mt-4">
          {programme.length === 0 ? (
            <p className="text-sm text-ink-muted">
              <Link href={`/courses/${formationId}`} className="font-semibold">
                Ajoutez d&apos;abord les matières au programme de la formation →
              </Link>
            </p>
          ) : enseignants.length === 0 ? (
            <p className="text-sm text-ink-muted">
              <Link href="/teachers/new" className="font-semibold">
                Ajoutez d&apos;abord un professeur →
              </Link>
            </p>
          ) : (
            <AssignmentForm sessionId={sessionId} enseignants={enseignants} programme={programme} />
          )}
        </div>
      )}
    </section>
  );
}
