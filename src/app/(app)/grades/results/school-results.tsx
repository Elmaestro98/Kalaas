import Link from "next/link";
import { FileDown, FileText } from "lucide-react";
import { SEUIL_VALIDATION, formatNote } from "@/lib/notes";
import { formatRang, libellePeriode, texteDecision, type DecoupageSaisie } from "@/lib/bulletins";
import type { ResultatsScolaires } from "@/lib/bulletins-donnees";
import type { Vocabulaire } from "@/lib/etablissement";
import PeriodTabs from "../period-tabs";

type SchoolResultsProps = {
  sessionId: string;
  resultats: ResultatsScolaires;
  vue: number | "ANNEE";
  decoupage: DecoupageSaisie;
  mots: Vocabulaire;
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

// Résultats d'une classe d'école : une période (ou l'année), matières en colonnes
export default function SchoolResults({ sessionId, resultats, vue, decoupage, mots }: SchoolResultsProps) {
  const annee = vue === "ANNEE";
  const stats = annee ? resultats.statsAnnee : resultats.stats[vue];
  const nbEvaluations = annee
    ? Object.values(resultats.evaluations).reduce((s, n) => s + n, 0)
    : resultats.evaluations[vue];
  const onglets = [
    ...resultats.periodes.map((p) => ({ valeur: p as number | "ANNEE", label: libellePeriode(decoupage, p) })),
    { valeur: "ANNEE" as const, label: "Année" },
  ];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PeriodTabs
          lien={(p) => `/grades/results?session=${sessionId}&periode=${p === "ANNEE" ? "annee" : p}`}
          periodes={onglets}
          active={vue}
        />
        <div className="flex-1" />
        {!annee && nbEvaluations > 0 && (
          <>
            <Link
              href={`/grades/report-cards?session=${sessionId}&periode=${vue}`}
              className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
            >
              <FileText size={18} aria-hidden="true" />
              Appréciations
            </Link>
            <a
              href={`/grades/report-cards/pdf?session=${sessionId}&periode=${vue}`}
              download
              className="flex h-11 items-center gap-2 rounded-md bg-action px-4 font-medium text-on-action hover:bg-action-hover"
            >
              <FileDown size={18} aria-hidden="true" />
              Bulletins de la classe (PDF)
            </a>
          </>
        )}
      </div>

      {resultats.sansPeriode > 0 && (
        <p className="mt-3 rounded-sm bg-warning-soft px-4 py-2 text-sm text-warning">
          {resultats.sansPeriode} évaluation{resultats.sansPeriode > 1 ? "s" : ""} sans période ne compte
          {resultats.sansPeriode > 1 ? "nt" : ""} pas dans les moyennes.
        </p>
      )}
      {!annee && nbEvaluations > 0 && !resultats.verrouille[vue] && (
        <p className="mt-3 rounded-sm bg-warning-soft px-4 py-2 text-sm text-warning">
          Certaines évaluations de la période ne sont pas verrouillées : les bulletins porteront la mention « PROVISOIRE ».
        </p>
      )}

      {resultats.lignes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucun {mots.apprenant} dans cette classe.
        </p>
      ) : nbEvaluations === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucune évaluation {annee ? "cette année" : `au ${libellePeriode(decoupage, vue)}`}.
        </p>
      ) : (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Moyenne de la classe", stats.moyenneClasse],
              ["Plus forte moyenne", stats.plusForte],
              ["Plus faible moyenne", stats.plusFaible],
            ].map(([label, valeur]) => (
              <div key={label as string} className="rounded-lg border border-border bg-surface-200 p-4">
                <dt className="text-xs text-ink-muted">{label}</dt>
                <dd className="mt-1 text-xl font-bold">
                  <Note valeur={valeur as number | null} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-200">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-surface-100 text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-surface-100 px-3 py-2 text-left font-semibold">
                    {mots.Apprenant}
                  </th>
                  {resultats.matieres.map((m, i) => (
                    <th key={m.id} scope="col" className={`px-3 py-2 text-center font-normal ${i === 0 ? "border-l border-border" : ""}`}>
                      <span className="font-semibold text-ink">{m.intitule}</span>
                      <span className="block">coef {m.coefficient}</span>
                    </th>
                  ))}
                  <th scope="col" className="border-l border-border px-3 py-2 font-semibold text-ink">
                    Moyenne
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold text-ink">
                    Rang
                  </th>
                  {annee && (
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-ink">
                      Décision
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultats.lignes.map((l) => {
                  const res = annee ? null : l.periodes[vue];
                  const moyenne = annee ? l.annuelle.moyenne : res!.moyenne;
                  const classement = annee ? l.annuelle : res!;
                  return (
                    <tr key={l.inscriptionId} className="hover:bg-gold-100/40">
                      <th scope="row" className="sticky left-0 bg-surface-200 px-3 py-2 text-left font-medium">
                        <span className="flex items-center gap-2">
                          {l.nom}
                          {!annee && (
                            <a
                              href={`/grades/report-cards/pdf?session=${sessionId}&periode=${vue}&inscription=${l.inscriptionId}`}
                              download
                              title="Bulletin (PDF)"
                              aria-label={`Bulletin de ${l.nom}`}
                              className="text-ink-muted hover:text-gold-700"
                            >
                              <FileDown size={15} aria-hidden="true" />
                            </a>
                          )}
                        </span>
                        {l.matricule && <span className="block font-mono text-xs font-normal text-ink-muted">{l.matricule}</span>}
                      </th>
                      {resultats.matieres.map((m, i) => {
                        const valeur = annee ? l.annuelle.moyennes[m.id] : res!.moyennes[m.id].moyenne;
                        const provisoire = !annee && valeur !== null && !res!.moyennes[m.id].complete;
                        return (
                          <td key={m.id} className={`px-3 py-2 text-center ${i === 0 ? "border-l border-border" : ""}`}>
                            <Note valeur={valeur} provisoire={provisoire} />
                          </td>
                        );
                      })}
                      <td className="border-l border-border px-3 py-2 text-center text-base font-bold">
                        <Note valeur={moyenne} provisoire={!annee && moyenne !== null && !res!.complete} />
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {formatRang(classement.rang, classement.exAequo)}
                      </td>
                      {annee && (
                        <td
                          className={`px-3 py-2 whitespace-nowrap ${
                            l.decision === "REDOUBLEMENT" ? "font-semibold text-danger" : l.decision ? "font-semibold" : "text-ink-muted"
                          }`}
                        >
                          {l.decision
                            ? texteDecision(l.decision, resultats.formation.cycle, resultats.formation.niveau, null)
                            : "À décider"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-surface-100 text-xs">
                <tr>
                  <th scope="row" className="sticky left-0 bg-surface-100 px-3 py-2 text-left font-semibold">
                    Moyenne de la classe
                  </th>
                  {resultats.matieres.map((m, i) => (
                    <td key={m.id} className={`px-3 py-2 text-center ${i === 0 ? "border-l border-border" : ""}`}>
                      <Note valeur={stats.moyennesMatieres[m.id] ?? null} />
                    </td>
                  ))}
                  <td className="border-l border-border px-3 py-2 text-center font-bold">
                    <Note valeur={stats.moyenneClasse} />
                  </td>
                  <td />
                  {annee && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}
