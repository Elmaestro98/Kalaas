"use client";

import { startTransition, useActionState, useState } from "react";
import { modifierDecoupage, type EtatDecoupage } from "./actions";
import { DECOUPAGES, type DecoupageSaisie } from "@/lib/bulletins";

const etatInitial: EtatDecoupage = { erreur: null };

export default function SchoolTermForm({ decoupageActuel }: { decoupageActuel: DecoupageSaisie }) {
  const [etat, envoyer, enCours] = useActionState(modifierDecoupage, etatInitial);
  const [decoupage, setDecoupage] = useState<DecoupageSaisie>(decoupageActuel);

  return (
    <form
      // Envoi manuel : le choix reste affiché après l'enregistrement
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="space-y-4"
    >
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Découpage de l&apos;année scolaire</legend>
        {(Object.keys(DECOUPAGES) as DecoupageSaisie[]).map((valeur) => (
          <label
            key={valeur}
            className={`cursor-pointer rounded-md border p-3 text-sm has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
              decoupage === valeur ? "border-navy-900 bg-navy-900 text-white" : "border-border bg-surface-100 text-ink"
            }`}
          >
            <input
              type="radio"
              name="decoupage"
              value={valeur}
              checked={decoupage === valeur}
              onChange={() => setDecoupage(valeur)}
              className="sr-only"
            />
            <span className="block font-semibold">{DECOUPAGES[valeur].label}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours || decoupage === decoupageActuel}
          className="h-11 cursor-pointer rounded-md border border-border bg-surface-200 px-4 font-medium hover:bg-surface-100 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {etat.erreur && <p className="text-sm text-danger">{etat.erreur}</p>}
      </div>
    </form>
  );
}
