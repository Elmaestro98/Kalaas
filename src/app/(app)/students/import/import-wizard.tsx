"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import {
  analyserFichier,
  importerApprenants,
  type EtatAnalyse,
  type ResultatImport,
} from "./actions";
import { formatFcfa } from "@/lib/format";
import { classeChamp } from "@/components/ui/field";

type OptionClasse = { id: string; label: string; groupe: string };

const etatInitial: EtatAnalyse = {
  erreur: null,
  sessionId: "",
  nomFichier: null,
  lignes: [],
  colonnes: [],
  colonnesIgnorees: [],
};

const STYLE_STATUT = {
  OK: "bg-success-soft text-success",
  ERREUR: "bg-danger-soft text-danger",
  DOUBLON: "bg-warning-soft text-warning",
} as const;

const LABEL_STATUT = { OK: "Prêt", ERREUR: "Erreur", DOUBLON: "Ignoré" } as const;

// Changer la « key » recrée l'assistant à neuf : c'est la façon React de le remettre à zéro
export default function ImportWizard({ classes }: { classes: OptionClasse[] }) {
  const [cle, setCle] = useState(0);
  return <Assistant key={cle} classes={classes} onRecommencer={() => setCle((c) => c + 1)} />;
}

function Assistant({ classes, onRecommencer }: { classes: OptionClasse[]; onRecommencer: () => void }) {
  const [analyse, analyser, enAnalyse] = useActionState(analyserFichier, etatInitial);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [enImport, demarrer] = useTransition();
  const [filtre, setFiltre] = useState<"TOUS" | "OK" | "ERREUR" | "DOUBLON">("TOUS");

  const prets = analyse.lignes.filter((l) => l.statut === "OK");
  const nbErreurs = analyse.lignes.filter((l) => l.statut === "ERREUR").length;
  const nbDoublons = analyse.lignes.filter((l) => l.statut === "DOUBLON").length;
  const classe = classes.find((c) => c.id === analyse.sessionId);
  const affichees = filtre === "TOUS" ? analyse.lignes : analyse.lignes.filter((l) => l.statut === filtre);

  function importer() {
    demarrer(async () => {
      setResultat(await importerApprenants({ sessionId: analyse.sessionId, lignes: prets }));
    });
  }

  // ─── Étape 3 : résultat ───
  if (resultat && !resultat.erreur) {
    return (
      <div className="rounded-lg border border-border bg-surface-200 p-6">
        <p className="flex items-center gap-2 text-lg font-semibold text-success">
          <CheckCircle2 size={24} aria-hidden="true" />
          {resultat.importes} apprenant{resultat.importes > 1 ? "s" : ""} importé{resultat.importes > 1 ? "s" : ""}
        </p>
        {classe && <p className="mt-1 text-sm text-ink-muted">Inscrits dans {classe.label}, avec leur échéancier.</p>}
        {resultat.echecs.length > 0 && (
          <div className="mt-4 rounded-md bg-warning-soft p-4 text-sm">
            <p className="font-semibold text-warning">{resultat.echecs.length} ligne(s) non importée(s)</p>
            <ul className="mt-2 space-y-1">
              {resultat.echecs.map((e) => (
                <li key={e.numero}>
                  Ligne {e.numero} · {e.nom} : {e.raison}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/students"
            className="flex h-11 items-center rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
          >
            Voir les apprenants
          </Link>
          <button
            type="button"
            onClick={onRecommencer}
            className="flex h-11 cursor-pointer items-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100"
          >
            Importer un autre fichier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Étape 1 : le fichier ─── */}
      <form action={analyser} className="space-y-5 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">1. Votre fichier</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Excel (.xlsx) ou CSV. Colonnes obligatoires : prénom, nom, téléphone.
            </p>
          </div>
          {/* Téléchargement d'un fichier .xlsx (pas une page) : un simple lien avec « download » */}
          <a
            href="/students/import/template"
            download
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-surface-100"
          >
            <Download size={16} aria-hidden="true" />
            Télécharger le modèle
          </a>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-100 px-6 py-8 text-center hover:border-gold-500">
          <FileSpreadsheet size={32} className="text-gold-700" aria-hidden="true" />
          <span className="font-medium">Choisir le fichier</span>
          <span className="text-xs text-ink-muted">900 Ko maximum · 1 000 lignes maximum</span>
          <input type="file" name="fichier" accept=".xlsx,.csv" required className="mt-2 text-sm" />
        </label>

        <div className="space-y-1.5">
          <label htmlFor="sessionId" className="text-sm font-medium">
            Inscrire dans une classe (facultatif)
          </label>
          <select id="sessionId" name="sessionId" defaultValue={analyse.sessionId} className={classeChamp()}>
            <option value="">Non : créer seulement les fiches apprenants</option>
            {[...new Set(classes.map((c) => c.groupe))].map((g) => (
              <optgroup key={g} label={g}>
                {classes
                  .filter((c) => c.groupe === g)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-ink-muted">
            Avec une classe, chaque apprenant est inscrit et son échéancier est créé ; la colonne « Déjà payé »
            est alors déduite des premières échéances.
          </p>
        </div>

        {analyse.erreur && (
          <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
            {analyse.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enAnalyse}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:opacity-60 sm:w-auto"
        >
          <Upload size={18} aria-hidden="true" />
          {enAnalyse ? "Analyse…" : analyse.lignes.length ? "Analyser à nouveau" : "Analyser le fichier"}
        </button>
      </form>

      {/* ─── Étape 2 : l'aperçu ─── */}
      {analyse.lignes.length > 0 && (
        <section className="rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
          <h2 className="font-semibold">2. Vérifiez avant d&apos;importer</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {analyse.nomFichier} · colonnes reconnues : {analyse.colonnes.join(", ")}
            {analyse.colonnesIgnorees.length > 0 && <> · ignorées : {analyse.colonnesIgnorees.join(", ")}</>}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["TOUS", `Toutes · ${analyse.lignes.length}`],
                ["OK", `Prêtes · ${prets.length}`],
                ["ERREUR", `Erreurs · ${nbErreurs}`],
                ["DOUBLON", `Ignorées · ${nbDoublons}`],
              ] as const
            ).map(([valeur, label]) => (
              <button
                key={valeur}
                type="button"
                onClick={() => setFiltre(valeur)}
                aria-pressed={filtre === valeur}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                  filtre === valeur ? "border-navy-900 bg-navy-900 text-white" : "border-border hover:bg-surface-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[28rem] overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="sticky top-0 bg-surface-100 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Ligne</th>
                  <th scope="col" className="px-3 py-2">Apprenant</th>
                  <th scope="col" className="px-3 py-2">Téléphone</th>
                  <th scope="col" className="px-3 py-2 text-right">Déjà payé</th>
                  <th scope="col" className="px-3 py-2">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affichees.map((l) => (
                  <tr key={l.numero}>
                    <td className="px-3 py-2 text-ink-muted tabular-nums">{l.numero}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {l.prenom} {l.nom}
                      </span>
                      {l.tuteurNom && <span className="block text-xs text-ink-muted">Tuteur : {l.tuteurNom}</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{l.telephone}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.dejaPaye ? formatFcfa(l.dejaPaye) : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE_STATUT[l.statut]}`}>
                        {LABEL_STATUT[l.statut]}
                      </span>
                      {l.message && <span className="ml-2 text-xs text-ink-muted">{l.message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resultat?.erreur && (
            <p role="alert" className="mt-4 rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
              {resultat.erreur}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={importer}
              disabled={enImport || prets.length === 0}
              className="h-12 cursor-pointer rounded-md bg-gold-500 px-6 font-semibold text-navy-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enImport
                ? "Import en cours…"
                : `Importer ${prets.length} apprenant${prets.length > 1 ? "s" : ""}${classe ? " et les inscrire" : ""}`}
            </button>
            {(nbErreurs > 0 || nbDoublons > 0) && (
              <p className="text-sm text-ink-muted">
                Les lignes en erreur ou ignorées ne seront pas importées : corrigez le fichier puis analysez-le à
                nouveau si besoin.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
