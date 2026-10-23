import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { vocabulaire } from "@/lib/etablissement";
import { LIBELLE_DECISION, SEUIL_VALIDATION, formatNote } from "@/lib/notes";
import { chargerResultatsClasse, classesPourNotes, cleSemestre } from "@/lib/notes-donnees";
import ClassSelect from "../class-select";
import { estScolaire } from "@/lib/lmd";
import { periodes as listePeriodes } from "@/lib/bulletins";
import { chargerResultatsScolaires, periodeEnCours } from "@/lib/bulletins-donnees";
import SchoolResults from "./school-results";
import PreschoolResults from "./preschool-results";

type ResultsPageProps = {
  searchParams: Promise<{ session?: string; periode?: string }>;
};

function Note({ valeur, provisoire }: { valeur: number | null; provisoire?: boolean }) {
  if (valeur === null) return <span className="text-ink-muted">—</span>;
  return (
    <span
      className={`tabular-nums ${valeur < SEUIL_VALIDATION ? "text-danger" : ""} ${provisoire ? "italic opacity-70" : ""}`}
      title={provisoire ? "Moyenne provisoire : des notes manquent" : undefined}
    >
      {formatNote(valeur)}
      {provisoire && "*"}
    </span>
  );
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");
  const mots = vocabulaire(institut.typeEtablissement);
  const params = await searchParams;

  const sessions = await classesPourNotes(db, membre);
  const classes = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.intitule} · ${s.nom}`,
    groupe: s.anneeAcademique ? `Année ${s.anneeAcademique.libelle}` : "Formations courtes",
  }));
  const session = sessions.find((s) => s.id === params.session) ?? sessions[0];

  // École : résultats par période (trimestres ou semestres) et bilan de l'année
  if (session && estScolaire(session.formation.cycle)) {
    const scolaires = await chargerResultatsScolaires(db, session.id, institut.decoupageScolaire);
    const periodes = listePeriodes(institut.decoupageScolaire);
    const demandee = Number(params.periode);
    const competences = scolaires?.parCompetences ?? false;
    const vue: number | "ANNEE" =
      params.periode === "annee" && !competences
        ? "ANNEE"
        : periodes.includes(demandee)
          ? demandee
          : ((await periodeEnCours(db, session.id, institut.decoupageScolaire)) ??
            Math.max(1, ...periodes.filter((p) => (scolaires?.evaluations[p] ?? 0) > 0)));
    return (
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/grades?session=${session.id}${vue === "ANNEE" ? "" : `&periode=${vue}`}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Notes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Résultats de la classe</h1>
        {competences ? (
          <p className="mt-1 text-sm text-ink-muted">
            Préscolaire : pas de notes ni de classement, chaque compétence est évaluée par un niveau d&apos;acquisition.
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Matière : évaluations de la période pondérées · moyenne générale : coefficients · année : moyenne des
            périodes{scolaires?.sur === 10 && " · élémentaire : moyennes sur 10"}.{" "}
            <span className="italic">{scolaires?.sur === 10 ? "6,50*" : "12,50*"}</span> = moyenne provisoire (notes
            manquantes).
          </p>
        )}
        <div className="mt-4 min-w-64">
          <ClassSelect valeur={session.id} chemin="/grades/results" classes={classes} />
        </div>
        {scolaires && competences && vue !== "ANNEE" && (
          <PreschoolResults
            sessionId={session.id}
            resultats={scolaires}
            periode={vue}
            decoupage={institut.decoupageScolaire}
            mots={mots}
          />
        )}
        {scolaires && !competences && (
          <SchoolResults
            sessionId={session.id}
            resultats={scolaires}
            vue={vue}
            decoupage={institut.decoupageScolaire}
            mots={mots}
          />
        )}
      </div>
    );
  }

  const resultats = session ? await chargerResultatsClasse(db, session.id) : null;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={session ? `/grades?session=${session.id}` : "/grades"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Notes
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Résultats de la classe</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Matière : évaluations pondérées · UE : coefficients · semestre : crédits · UE validée à {SEUIL_VALIDATION}/20 ou
        par compensation. <span className="italic">12,50*</span> = moyenne provisoire (notes manquantes).
      </p>

      {session && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="min-w-64 flex-1">
            <ClassSelect valeur={session.id} chemin="/grades/results" classes={classes} />
          </div>
          {resultats && resultats.nbEvaluations > 0 && resultats.lignes.length > 0 && (
            <a
              href={`/grades/transcript?session=${session.id}`}
              download
              className="flex h-11 items-center gap-2 rounded-md bg-action px-4 font-medium text-on-action hover:bg-action-hover"
            >
              <FileDown size={18} aria-hidden="true" />
              Relevés de toute la classe (PDF)
            </a>
          )}
        </div>
      )}
      {resultats && resultats.nbEvaluations > 0 && !resultats.toutVerrouille && (
        <p className="mt-3 rounded-sm bg-warning-soft px-4 py-2 text-sm text-warning">
          Certaines évaluations ne sont pas verrouillées : les relevés porteront la mention « PROVISOIRE ». Verrouillez-les
          dans « Notes » pour éditer des relevés définitifs.
        </p>
      )}

      {!resultats || resultats.lignes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucun {mots.apprenant} ou aucune classe.
        </p>
      ) : resultats.nbEvaluations === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucune évaluation créée pour cette classe.
        </p>
      ) : (
        resultats.blocs.map((bloc) => {
          const cle = cleSemestre(bloc.semestre);
          const titre = !resultats.lmd ? "Moyennes" : bloc.semestre ? `Semestre ${bloc.semestre}` : "Semestre non précisé";
          const admis = resultats.lignes.filter((l) => l.semestres[cle]?.valide).length;
          return (
            <section key={cle} className="mt-6">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{titre}</h2>
                <p className="text-sm text-ink-muted">
                  {admis}/{resultats.lignes.length} {resultats.lmd ? "semestres validés" : "admis"}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-surface-200">
                <table className="w-full min-w-max text-sm">
                  <thead className="text-xs text-ink-muted">
                    <tr className="bg-surface-100">
                      <th scope="col" rowSpan={2} className="sticky left-0 z-10 bg-surface-100 px-3 py-2 text-left font-semibold">
                        {mots.Apprenant}
                      </th>
                      {bloc.ues.map((u) => (
                        <th
                          key={u.id}
                          scope="colgroup"
                          colSpan={u.matieres.length + (resultats.lmd ? 1 : 0)}
                          className="border-l border-border px-3 py-2 text-center font-semibold text-ink"
                        >
                          {u.intitule}
                          {resultats.lmd && <span className="block font-normal text-ink-muted">{u.credits ?? 0} crédits</span>}
                        </th>
                      ))}
                      <th scope="col" rowSpan={2} className="border-l border-border px-3 py-2 font-semibold text-ink">
                        Moyenne
                      </th>
                      {resultats.lmd && (
                        <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-ink">
                          Crédits
                        </th>
                      )}
                    </tr>
                    <tr className="bg-surface-100">
                      {bloc.ues.map((u) => (
                        <FragmentsEntetes key={u.id} matieres={u.matieres} lmd={resultats.lmd} />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resultats.lignes.map((l) => {
                      const s = l.semestres[cle];
                      return (
                        <tr key={l.inscriptionId} className="hover:bg-gold-100/40">
                          <th scope="row" className="sticky left-0 bg-surface-200 px-3 py-2 text-left font-medium">
                            <span className="flex items-center gap-2">
                              {l.nom}
                              <a
                                href={`/grades/transcript?session=${session?.id}&inscription=${l.inscriptionId}`}
                                download
                                title="Relevé de notes (PDF)"
                                aria-label={`Relevé de notes de ${l.nom}`}
                                className="text-ink-muted hover:text-gold-700"
                              >
                                <FileDown size={15} aria-hidden="true" />
                              </a>
                            </span>
                            {l.matricule && <span className="block font-mono text-xs font-normal text-ink-muted">{l.matricule}</span>}
                          </th>
                          {bloc.ues.map((u) => {
                            const ue = s?.ues.find((x) => x.id === u.id);
                            return (
                              <FragmentsCellules
                                key={u.id}
                                matieres={u.matieres.map((m) => l.moyennes[m.id])}
                                ue={resultats.lmd ? ue ?? null : null}
                              />
                            );
                          })}
                          <td className="border-l border-border px-3 py-2 text-center text-base font-bold">
                            <Note valeur={s?.moyenne ?? null} provisoire={s ? !s.complete : false} />
                          </td>
                          {resultats.lmd && (
                            <td className="px-3 py-2 text-center tabular-nums">
                              {s ? `${s.creditsAcquis}/${s.creditsTotal}` : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function FragmentsEntetes({ matieres, lmd }: { matieres: { id: string; intitule: string; coefficient: number | null }[]; lmd: boolean }) {
  return (
    <>
      {matieres.map((m, i) => (
        <th
          key={m.id}
          scope="col"
          className={`px-3 py-1.5 text-center font-normal ${i === 0 ? "border-l border-border" : ""}`}
        >
          {m.intitule}
          <span className="block">coef {m.coefficient ?? 1}</span>
        </th>
      ))}
      {lmd && (
        <th scope="col" className="px-3 py-1.5 text-center font-semibold text-ink">
          Moy. UE
        </th>
      )}
    </>
  );
}

function FragmentsCellules({
  matieres,
  ue,
}: {
  matieres: ({ moyenne: number | null; complete: boolean } | undefined)[];
  ue: { moyenne: number | null; complete: boolean; decision: keyof typeof LIBELLE_DECISION | null } | null;
}) {
  return (
    <>
      {matieres.map((m, i) => (
        <td key={i} className={`px-3 py-2 text-center ${i === 0 ? "border-l border-border" : ""}`}>
          <Note valeur={m?.moyenne ?? null} provisoire={m ? !m.complete && m.moyenne !== null : false} />
        </td>
      ))}
      {ue && (
        <td className="px-3 py-2 text-center">
          <span className="font-semibold">
            <Note valeur={ue.moyenne} provisoire={!ue.complete && ue.moyenne !== null} />
          </span>
          {ue.decision && (
            <span className={`mt-0.5 block rounded-full px-1.5 text-[10px] font-semibold ${LIBELLE_DECISION[ue.decision].classe}`}>
              {LIBELLE_DECISION[ue.decision].label}
            </span>
          )}
        </td>
      )}
    </>
  );
}
