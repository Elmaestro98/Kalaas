import Link from "next/link";
import { FileDown, ListChecks } from "lucide-react";
import { NIVEAU, NIVEAUX_ACQUISITION, libellePeriode, texteDecision, type DecoupageSaisie, type NiveauSaisie } from "@/lib/bulletins";
import type { ResultatsScolaires } from "@/lib/bulletins-donnees";
import type { Vocabulaire } from "@/lib/etablissement";
import PeriodTabs from "../period-tabs";

type PreschoolResultsProps = {
  sessionId: string;
  resultats: ResultatsScolaires;
  periode: number;
  decoupage: DecoupageSaisie;
  mots: Vocabulaire;
};

const TON: Record<NiveauSaisie, string> = {
  ACQUIS: "bg-success-soft text-success",
  EN_COURS: "bg-warning-soft text-warning",
  NON_ACQUIS: "bg-danger-soft text-danger",
};

function Niveau({ valeur }: { valeur: NiveauSaisie | undefined }) {
  if (!valeur) return <span className="text-ink-muted">—</span>;
  return (
    <span title={NIVEAU[valeur].label} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TON[valeur]}`}>
      {NIVEAU[valeur].court}
    </span>
  );
}

// Résultats d'une classe du préscolaire : niveau d'acquisition de chaque compétence sur une période
export default function PreschoolResults({ sessionId, resultats, periode, decoupage, mots }: PreschoolResultsProps) {
  const derniere = periode === resultats.periodes.length;
  const nbEvalues = resultats.evaluations[periode];
  const nbCompetences = resultats.matieres.length;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PeriodTabs
          lien={(p) => `/grades/results?session=${sessionId}&periode=${p}`}
          periodes={resultats.periodes.map((p) => ({ valeur: p, label: libellePeriode(decoupage, p) }))}
          active={periode}
        />
        <div className="flex-1" />
        <Link
          href={`/grades/report-cards?session=${sessionId}&periode=${periode}`}
          className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
        >
          <ListChecks size={18} aria-hidden="true" />
          Évaluer les compétences
        </Link>
        {nbEvalues > 0 && (
          <a
            href={`/grades/report-cards/pdf?session=${sessionId}&periode=${periode}`}
            download
            className="flex h-11 items-center gap-2 rounded-md bg-action px-4 font-medium text-on-action hover:bg-action-hover"
          >
            <FileDown size={18} aria-hidden="true" />
            Bulletins de la classe (PDF)
          </a>
        )}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {NIVEAUX_ACQUISITION.map((n) => (
          <span key={n.valeur} className="flex items-center gap-1.5">
            <Niveau valeur={n.valeur} /> {n.label}
          </span>
        ))}
      </p>

      {resultats.lignes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucun {mots.apprenant} dans cette classe.
        </p>
      ) : nbCompetences === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          La formation n&apos;a pas encore de compétences : ajoutez-les comme matières dans son programme.
        </p>
      ) : nbEvalues === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucune compétence évaluée au {libellePeriode(decoupage, periode)}.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-200">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-surface-100 text-xs text-ink-muted">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface-100 px-3 py-2 text-left font-semibold">
                  {mots.Apprenant}
                </th>
                {resultats.matieres.map((m, i) => (
                  <th
                    key={m.id}
                    scope="col"
                    className={`px-3 py-2 text-center font-semibold text-ink ${i === 0 ? "border-l border-border" : ""}`}
                  >
                    {m.intitule}
                  </th>
                ))}
                <th scope="col" className="border-l border-border px-3 py-2 font-semibold text-ink">
                  Acquises
                </th>
                {derniere && (
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-ink">
                    Décision
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resultats.lignes.map((l) => {
                const niveaux = l.competences[periode];
                const acquises = Object.values(niveaux).filter((n) => n === "ACQUIS").length;
                return (
                  <tr key={l.inscriptionId} className="hover:bg-gold-100/40">
                    <th scope="row" className="sticky left-0 bg-surface-200 px-3 py-2 text-left font-medium">
                      <span className="flex items-center gap-2">
                        {l.nom}
                        <a
                          href={`/grades/report-cards/pdf?session=${sessionId}&periode=${periode}&inscription=${l.inscriptionId}`}
                          download
                          title="Bulletin (PDF)"
                          aria-label={`Bulletin de ${l.nom}`}
                          className="text-ink-muted hover:text-gold-700"
                        >
                          <FileDown size={15} aria-hidden="true" />
                        </a>
                      </span>
                      {l.matricule && <span className="block font-mono text-xs font-normal text-ink-muted">{l.matricule}</span>}
                    </th>
                    {resultats.matieres.map((m, i) => (
                      <td key={m.id} className={`px-3 py-2 text-center ${i === 0 ? "border-l border-border" : ""}`}>
                        <Niveau valeur={niveaux[m.id]} />
                      </td>
                    ))}
                    <td className="border-l border-border px-3 py-2 text-center font-semibold tabular-nums">
                      {acquises}/{nbCompetences}
                    </td>
                    {derniere && (
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
                  Élèves ayant acquis
                </th>
                {resultats.matieres.map((m, i) => (
                  <td key={m.id} className={`px-3 py-2 text-center tabular-nums ${i === 0 ? "border-l border-border" : ""}`}>
                    {resultats.lignes.filter((l) => l.competences[periode][m.id] === "ACQUIS").length}/{resultats.lignes.length}
                  </td>
                ))}
                <td className="border-l border-border" />
                {derniere && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
