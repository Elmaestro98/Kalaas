import Link from "next/link";
import { BarChart3, Lock, PenLine, Trash2, Unlock } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { TYPES_EVALUATION } from "@/lib/notes";
import { classesPourNotes, matieresNotables } from "@/lib/notes-donnees";
import { basculerVerrou, supprimerEvaluation } from "./actions";
import ClassSelect from "./class-select";
import EvaluationForm from "./evaluation-form";

type GradesPageProps = {
  searchParams: Promise<{ session?: string }>;
};

const LABEL_TYPE = Object.fromEntries(TYPES_EVALUATION.map((t) => [t.valeur, t.label]));

export default async function GradesPage({ searchParams }: GradesPageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR", "FORMATEUR");
  const estDirecteur = membre.role === "DIRECTEUR";
  const params = await searchParams;

  const sessions = await classesPourNotes(db, membre);
  const classes = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.intitule} · ${s.nom}`,
    groupe: s.anneeAcademique ? `Année ${s.anneeAcademique.libelle}` : "Formations courtes",
  }));
  const session = sessions.find((s) => s.id === params.session) ?? sessions[0];

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold lg:text-3xl">Notes</h1>
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center text-sm text-ink-muted">
          {estDirecteur
            ? "Aucune classe en cours."
            : "Aucune classe : vous devez être affecté à une matière (ou donner des cours) dans une classe."}
        </p>
      </div>
    );
  }

  const [matieres, evaluations, nbInscrits, notables] = await Promise.all([
    db.matiere.findMany({
      where: { formationId: session.formation.id, active: true },
      orderBy: [{ semestre: "asc" }, { ordre: "asc" }, { intitule: "asc" }],
      include: { unite: { select: { code: true, intitule: true } } },
    }),
    db.evaluation.findMany({
      where: { sessionId: session.id },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { notes: true } } },
    }),
    db.inscription.count({ where: { sessionId: session.id, statut: { in: ["ACTIVE", "TERMINEE"] } } }),
    matieresNotables(db, membre, session.id),
  ]);

  const visibles = notables === "TOUTES" ? matieres : matieres.filter((m) => notables.has(m.id));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Notes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Créez les évaluations de chaque matière avec leur poids, puis saisissez les notes sur la grille.
          </p>
        </div>
        {estDirecteur && (
          <Link
            href={`/grades/results?session=${session.id}`}
            className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-4 font-medium text-navy-900 hover:opacity-90"
          >
            <BarChart3 size={18} aria-hidden="true" />
            Résultats de la classe
          </Link>
        )}
      </div>

      <div className="mt-4">
        <ClassSelect valeur={session.id} chemin="/grades" classes={classes} />
        <p className="mt-1 text-xs text-ink-muted">
          {nbInscrits} apprenant{nbInscrits > 1 ? "s" : ""} ·{" "}
          <Link href={`/courses/${session.formation.id}`} className="font-medium">
            programme et coefficients
          </Link>
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          {matieres.length === 0
            ? "La formation n'a pas encore de matières : complétez son programme."
            : "Aucune matière à noter pour vous dans cette classe."}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {visibles.map((m) => {
            const siennes = evaluations.filter((e) => e.matiereId === m.id);
            const poidsTotal = siennes.reduce((s, e) => s + e.poids, 0);
            return (
              <section key={m.id} className="rounded-lg border border-border bg-surface-200 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    {m.intitule}
                    <span className="ml-2 text-xs font-normal text-ink-muted">
                      coef {m.coefficient ?? 1}
                      {m.unite && ` · ${m.unite.code ?? m.unite.intitule}`}
                      {m.semestre && ` · S${m.semestre}`}
                    </span>
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      poidsTotal === 100 ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                    }`}
                  >
                    Poids {poidsTotal} %{poidsTotal !== 100 && " (100 % attendu)"}
                  </span>
                </div>

                {siennes.length > 0 && (
                  <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                    {siennes.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-sm">
                        <span className="min-w-36 flex-1">
                          <span className="font-medium">{e.intitule}</span>
                          <span className="block text-xs text-ink-muted">
                            {LABEL_TYPE[e.type]} · {e.date ? formatDate(e.date) : "date libre"} · sur {e.bareme}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-ink-muted">{e.poids} %</span>
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            e._count.notes >= nbInscrits && nbInscrits > 0 ? "text-success" : "text-warning"
                          }`}
                        >
                          {e._count.notes}/{nbInscrits} notés
                        </span>
                        {e.verrouillee && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-ink-muted">
                            <Lock size={12} aria-hidden="true" />
                            Verrouillée
                          </span>
                        )}
                        <Link
                          href={`/grades/entry?evaluation=${e.id}`}
                          className="flex h-9 items-center gap-1.5 rounded-md bg-action px-3 text-xs font-medium text-on-action hover:bg-action-hover"
                        >
                          <PenLine size={14} aria-hidden="true" />
                          {e.verrouillee ? "Voir" : "Saisir"}
                        </Link>
                        {estDirecteur && (
                          <form action={basculerVerrou}>
                            <input type="hidden" name="id" value={e.id} />
                            <button
                              type="submit"
                              title={e.verrouillee ? "Déverrouiller" : "Verrouiller (publier)"}
                              aria-label={e.verrouillee ? "Déverrouiller" : "Verrouiller"}
                              className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-surface-100"
                            >
                              {e.verrouillee ? <Unlock size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
                            </button>
                          </form>
                        )}
                        {!e.verrouillee && e._count.notes === 0 && (
                          <form action={supprimerEvaluation}>
                            <input type="hidden" name="id" value={e.id} />
                            <button
                              type="submit"
                              title="Supprimer (aucune note saisie)"
                              aria-label={`Supprimer ${e.intitule}`}
                              className="flex size-9 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <details className="mt-3" open={siennes.length === 0}>
                  <summary className="cursor-pointer text-sm font-medium text-gold-700">+ Nouvelle évaluation</summary>
                  <div className="mt-2">
                    <EvaluationForm
                      sessionId={session.id}
                      matiereId={m.id}
                      poidsRestant={100 - poidsTotal}
                      suggestion={
                        poidsTotal >= 40 && !siennes.some((e) => e.type === "EXAMEN")
                          ? "Examen"
                          : `Devoir ${siennes.filter((e) => e.type === "DEVOIR").length + 1}`
                      }
                    />
                  </div>
                </details>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
