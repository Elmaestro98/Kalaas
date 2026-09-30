"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { enregistrerAppel, type EtatAppel } from "./actions";
import { STATUTS_PRESENCE, compter, type StatutPresence } from "@/lib/presences";

export type LigneAppel = {
  inscriptionId: string;
  nom: string;
  matricule: string | null;
  statut: StatutPresence;
  absences: number; // absences non excusées dans la classe, avant cet appel
};

type CallFormProps = {
  creneauId: string;
  date: string;
  lignes: LigneAppel[];
  dejaFait: boolean;
};

const etatInitial: EtatAppel = { erreur: null };

export default function CallForm({ creneauId, date, lignes, dejaFait }: CallFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerAppel, etatInitial);
  const [statuts, setStatuts] = useState<Record<string, StatutPresence>>(() =>
    Object.fromEntries(lignes.map((l) => [l.inscriptionId, l.statut])),
  );

  const compteurs = compter(Object.values(statuts));

  function tousPresents() {
    setStatuts(Object.fromEntries(lignes.map((l) => [l.inscriptionId, "PRESENT" as const])));
  }

  return (
    <form action={envoyer} className="pb-24 lg:pb-0">
      <input type="hidden" name="creneauId" value={creneauId} />
      <input type="hidden" name="date" value={date} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          <b className="text-success">{compteurs.PRESENT} présents</b> · <b className="text-danger">{compteurs.ABSENT} absents</b>
          {compteurs.RETARD > 0 && <> · {compteurs.RETARD} en retard</>}
          {compteurs.EXCUSE > 0 && <> · {compteurs.EXCUSE} excusés</>}
        </p>
        <button
          type="button"
          onClick={tousPresents}
          className="h-9 cursor-pointer rounded-md border border-border bg-surface-200 px-3 text-sm font-medium hover:bg-surface-100"
        >
          Tous présents
        </button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
        {lignes.map((l) => (
          <li key={l.inscriptionId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <input type="hidden" name={`p_${l.inscriptionId}`} value={statuts[l.inscriptionId]} />
            <div className="min-w-40 flex-1">
              <p className="font-medium">{l.nom}</p>
              <p className="text-xs text-ink-muted">
                {l.matricule && <span className="font-mono">{l.matricule}</span>}
                {l.absences > 0 && (
                  <span className={l.absences >= 3 ? "font-semibold text-danger" : ""}>
                    {l.matricule ? " · " : ""}
                    {l.absences} absence{l.absences > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <div role="radiogroup" aria-label={`Présence de ${l.nom}`} className="flex gap-1.5">
              {STATUTS_PRESENCE.map((s) => {
                const actif = statuts[l.inscriptionId] === s.valeur;
                return (
                  <button
                    key={s.valeur}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => setStatuts((ancien) => ({ ...ancien, [l.inscriptionId]: s.valeur }))}
                    className={`size-11 cursor-pointer rounded-md border text-sm font-bold ${
                      actif ? s.actif : "border-border bg-surface-100 text-ink-muted hover:bg-surface-200"
                    }`}
                  >
                    {s.court}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-ink-muted">P = présent · A = absent · R = en retard · E = excusé</p>

      {etat.erreur && (
        <p role="alert" className="mt-3 rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreur}
        </p>
      )}

      {/* Barre d'action : fixée en bas sur mobile pour valider au pouce */}
      <div className="fixed inset-x-0 bottom-18 z-10 flex gap-3 border-t border-border bg-surface-200 p-3 lg:static lg:mt-5 lg:justify-end lg:border-0 lg:bg-transparent lg:p-0">
        <Link
          href={`/attendance?date=${date}`}
          className="flex h-12 flex-1 items-center justify-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100 lg:flex-none"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={enCours}
          className="h-12 flex-[2] cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:opacity-60 lg:flex-none"
        >
          {enCours ? "Enregistrement…" : dejaFait ? "Mettre à jour l'appel" : "Valider l'appel"}
        </button>
      </div>
    </form>
  );
}
