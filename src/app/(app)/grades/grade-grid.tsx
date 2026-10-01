"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { enregistrerNotes, type EtatSaisie } from "./actions";
import { formatNote, lireNote, type StatutNoteSaisie } from "@/lib/notes";

export type LigneNote = {
  inscriptionId: string;
  nom: string;
  matricule: string | null;
  saisie: string; // « 12,5 » ou vide
  statut: StatutNoteSaisie;
};

type GradeGridProps = {
  evaluationId: string;
  bareme: number;
  verrouillee: boolean;
  lignes: LigneNote[];
  retour: string;
};

const etatInitial: EtatSaisie = { erreur: null, enregistre: false, erreursLignes: [] };

export default function GradeGrid({ evaluationId, bareme, verrouillee, lignes, retour }: GradeGridProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerNotes, etatInitial);
  const [valeurs, setValeurs] = useState(() =>
    Object.fromEntries(lignes.map((l) => [l.inscriptionId, { saisie: l.saisie, statut: l.statut }])),
  );

  // Statistiques en direct sur les notes valides
  const notes = Object.values(valeurs)
    .filter((v) => v.statut === "NOTEE")
    .map((v) => lireNote(v.saisie, bareme))
    .filter((n): n is number => n !== null)
    .map((n) => n / 100);
  const moyenne = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
  const saisies = Object.values(valeurs).filter((v) => v.statut !== "NOTEE" || v.saisie.trim() !== "").length;

  function changer(id: string, champ: "saisie" | "statut", valeur: string) {
    setValeurs((ancien) => ({ ...ancien, [id]: { ...ancien[id], [champ]: valeur } }));
  }

  return (
    <form action={envoyer} className="pb-24 lg:pb-0">
      <input type="hidden" name="evaluationId" value={evaluationId} />

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
        <span>
          <b className="text-ink">{saisies}</b>/{lignes.length} saisies
        </span>
        <span>
          Moyenne de la classe : <b className="text-ink">{moyenne === null ? "—" : formatNote(moyenne)}</b> / {bareme}
        </span>
        {notes.length > 0 && (
          <span>
            Min {formatNote(Math.min(...notes))} · Max {formatNote(Math.max(...notes))}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
        {lignes.map((l, index) => {
          const v = valeurs[l.inscriptionId];
          const invalide = v.statut === "NOTEE" && v.saisie.trim() !== "" && lireNote(v.saisie, bareme) === null;
          return (
            <li key={l.inscriptionId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="w-6 text-xs text-ink-muted tabular-nums">{index + 1}</span>
              <div className="min-w-40 flex-1">
                <p className="font-medium">{l.nom}</p>
                {l.matricule && <p className="font-mono text-xs text-ink-muted">{l.matricule}</p>}
              </div>
              <select
                name={`s_${l.inscriptionId}`}
                value={v.statut}
                disabled={verrouillee}
                aria-label={`Statut de ${l.nom}`}
                onChange={(e) => changer(l.inscriptionId, "statut", e.target.value)}
                className="h-10 rounded-sm border border-border bg-surface-200 px-2 text-sm"
              >
                <option value="NOTEE">Noté</option>
                <option value="ABSENT">Absent (0)</option>
                <option value="DISPENSE">Dispensé</option>
              </select>
              <div className="flex items-center gap-1">
                <input
                  name={`n_${l.inscriptionId}`}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`Note de ${l.nom}`}
                  placeholder="—"
                  disabled={verrouillee || v.statut !== "NOTEE"}
                  value={v.statut === "NOTEE" ? v.saisie : ""}
                  onChange={(e) => changer(l.inscriptionId, "saisie", e.target.value)}
                  className={`h-10 w-20 rounded-sm border bg-surface-200 px-2 text-right text-lg font-semibold tabular-nums outline-none focus:ring-4 ${
                    invalide
                      ? "border-danger focus:ring-danger-soft"
                      : "border-border focus:border-gold-500 focus:ring-gold-100"
                  }`}
                />
                <span className="text-sm text-ink-muted">/ {bareme}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">
        Notes décimales acceptées (12,5 ou 12,75). Laissez vide un élève pas encore noté : sa moyenne restera provisoire.
      </p>

      {etat.erreur && (
        <div role="alert" className="mt-3 rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-semibold">{etat.erreur}</p>
          {etat.erreursLignes.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {etat.erreursLignes.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {etat.enregistre && (
        <p className="mt-3 flex items-center gap-2 rounded-sm bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          Notes enregistrées.
        </p>
      )}

      {!verrouillee && (
        <div className="fixed inset-x-0 bottom-18 z-10 flex gap-3 border-t border-border bg-surface-200 p-3 lg:static lg:mt-5 lg:justify-end lg:border-0 lg:bg-transparent lg:p-0">
          <Link
            href={retour}
            className="flex h-12 flex-1 items-center justify-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100 lg:flex-none"
          >
            Retour
          </Link>
          <button
            type="submit"
            disabled={enCours}
            className="h-12 flex-[2] cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:opacity-60 lg:flex-none"
          >
            {enCours ? "Enregistrement…" : "Enregistrer les notes"}
          </button>
        </div>
      )}
    </form>
  );
}
