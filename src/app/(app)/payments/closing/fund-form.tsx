"use client";

import { startTransition, useActionState, useState } from "react";
import { definirFondsCaisse, type EtatFonds } from "./actions";
import { classeChamp } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";

const etatInitial: EtatFonds = { erreur: null, succes: false };

type FundFormProps = { fondsActuel: number; declare: boolean };

export default function FundForm({ fondsActuel, declare }: FundFormProps) {
  const [etat, envoyer, enCours] = useActionState(definirFondsCaisse, etatInitial);
  const [montant, setMontant] = useState(fondsActuel);

  return (
    <form
      // Envoi manuel : le montant saisi reste affiché même en cas d'erreur
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="space-y-2"
    >
      <label htmlFor="fonds" className="text-sm font-medium">
        Fonds de caisse du matin
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <MoneyInput
            id="fonds"
            name="montant"
            value={montant}
            onChange={setMontant}
            invalid={!!etat.erreur}
            className={classeChamp(etat.erreur ?? undefined)}
          />
        </div>
        <button
          type="submit"
          disabled={enCours || (declare && montant === fondsActuel)}
          className="h-11 cursor-pointer rounded-md border border-border bg-surface-100 px-4 text-sm font-medium hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "…" : declare ? "Modifier" : "Déclarer"}
        </button>
      </div>
      {etat.erreur ? (
        <p className="text-sm text-danger">{etat.erreur}</p>
      ) : (
        <p className="text-xs text-ink-muted">
          Les espèces déjà dans la caisse en début de journée (monnaie pour rendre). Laissez 0 si la caisse était
          vide.
        </p>
      )}
    </form>
  );
}
