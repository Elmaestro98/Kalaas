"use client";

import { useActionState, useState } from "react";
import { payerVacation, type EtatPaiementVacation } from "../actions";
import { classeChamp } from "@/components/ui/field";
import { MODES_PAIEMENT, referenceObligatoire, type ModePaiementSaisie } from "@/lib/paiements";

const etatInitial: EtatPaiementVacation = { erreur: null };

export default function PayForm({ vacationId }: { vacationId: string }) {
  const [etat, envoyer, enCours] = useActionState(payerVacation, etatInitial);
  const [mode, setMode] = useState<ModePaiementSaisie>("ESPECES");

  return (
    <form action={envoyer} className="space-y-3 rounded-lg border border-border bg-surface-200 p-4 print:hidden">
      <input type="hidden" name="vacationId" value={vacationId} />
      <p className="font-semibold">Enregistrer le paiement</p>

      <fieldset>
        <legend className="text-sm font-medium">Moyen de paiement</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES_PAIEMENT.map((m) => (
            <label
              key={m.valeur}
              className={`flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm font-medium ${
                mode === m.valeur ? "border-gold-500 bg-gold-100 text-ink" : "border-border bg-surface-100 text-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m.valeur}
                checked={mode === m.valeur}
                onChange={() => setMode(m.valeur)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {referenceObligatoire(mode) && (
        <div className="space-y-1.5">
          <label htmlFor="reference" className="text-sm font-medium">
            Référence de la transaction<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="reference"
            name="reference"
            required
            minLength={4}
            maxLength={60}
            autoComplete="off"
            className={classeChamp(etat.erreur ?? undefined)}
          />
        </div>
      )}
      {!referenceObligatoire(mode) && <input type="hidden" name="reference" value="" />}

      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : "Marquer comme payé"}
      </button>
    </form>
  );
}
