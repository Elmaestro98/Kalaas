"use client";

import { startTransition, useActionState, useState } from "react";
import { enregistrerDatesPeriodes, type EtatDatesPeriodes } from "./actions";
import { classeChamp } from "@/components/ui/field";
import type { DatesPeriode } from "@/lib/bulletins";

const etatInitial: EtatDatesPeriodes = { erreur: null };

type TermDatesFormProps = {
  anneeId: string;
  libelles: string[]; // « 1er trimestre », « 2e trimestre »…
  datesInitiales: DatesPeriode[]; // enregistrées, sinon proposées
  enregistrees: boolean;
};

export default function TermDatesForm({ anneeId, libelles, datesInitiales, enregistrees }: TermDatesFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerDatesPeriodes, etatInitial);
  const [dates, setDates] = useState(datesInitiales);

  const changer = (numero: number, champ: "dateDebut" | "dateFin", valeur: string) =>
    setDates((avant) => avant.map((d) => (d.numero === numero ? { ...d, [champ]: valeur } : d)));

  return (
    <form
      // Envoi manuel : les dates restent affichées après l'enregistrement
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="space-y-3"
    >
      <input type="hidden" name="anneeId" value={anneeId} />
      {!enregistrees && (
        <p className="rounded-sm bg-warning-soft px-3 py-2 text-xs text-warning">
          Dates proposées (non enregistrées) : vérifiez-les avec votre calendrier, puis enregistrez.
        </p>
      )}
      <div className="space-y-2">
        {dates.map((d, i) => (
          <div key={d.numero} className="grid items-center gap-2 sm:grid-cols-[9rem_1fr_auto_1fr]">
            <span className="text-sm font-medium">{libelles[i]}</span>
            <input
              type="date"
              name={`debut_${d.numero}`}
              value={d.dateDebut}
              onChange={(e) => changer(d.numero, "dateDebut", e.target.value)}
              aria-label={`Début du ${libelles[i]}`}
              required
              className={`${classeChamp()} h-10`}
            />
            <span className="hidden text-sm text-ink-muted sm:block">→</span>
            <input
              type="date"
              name={`fin_${d.numero}`}
              value={d.dateFin}
              onChange={(e) => changer(d.numero, "dateFin", e.target.value)}
              aria-label={`Fin du ${libelles[i]}`}
              required
              className={`${classeChamp()} h-10`}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="h-11 cursor-pointer rounded-md border border-border bg-surface-200 px-4 font-medium hover:bg-surface-100 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Enregistrer les dates"}
        </button>
        {etat.erreur && <p role="alert" className="text-sm text-danger">{etat.erreur}</p>}
      </div>
    </form>
  );
}
