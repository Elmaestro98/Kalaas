"use client";

import { startTransition, useActionState, useState } from "react";
import { modifierPlafondDepense, type EtatPlafond } from "./actions";
import { classeChamp } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";

const etatInitial: EtatPlafond = { erreur: null, succes: false };

type Regle = "aucune" | "plafond" | "interdit";

const REGLES: { valeur: Regle; label: string; aide: string }[] = [
  { valeur: "aucune", label: "Pas de limite", aide: "Le caissier saisit toutes les dépenses." },
  { valeur: "plafond", label: "Jusqu'à un montant", aide: "Au-delà, seul le directeur peut saisir la dépense." },
  { valeur: "interdit", label: "Directeur uniquement", aide: "Le caissier ne saisit aucune dépense." },
];

export default function ExpenseLimitForm({ plafondActuel }: { plafondActuel: number | null }) {
  const [etat, envoyer, enCours] = useActionState(modifierPlafondDepense, etatInitial);
  const [regle, setRegle] = useState<Regle>(
    plafondActuel === null ? "aucune" : plafondActuel === 0 ? "interdit" : "plafond",
  );
  const [montant, setMontant] = useState(plafondActuel && plafondActuel > 0 ? plafondActuel : 50_000);

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
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">Règle pour les caissiers</legend>
        {REGLES.map((r) => (
          <label
            key={r.valeur}
            className={`cursor-pointer rounded-md border p-3 text-sm has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
              regle === r.valeur ? "border-navy-900 bg-navy-900 text-white" : "border-border bg-surface-100 text-ink"
            }`}
          >
            <input
              type="radio"
              name="regle"
              value={r.valeur}
              checked={regle === r.valeur}
              onChange={() => setRegle(r.valeur)}
              className="sr-only"
            />
            <span className="block font-semibold">{r.label}</span>
            <span className={`text-xs ${regle === r.valeur ? "text-white/70" : "text-ink-muted"}`}>{r.aide}</span>
          </label>
        ))}
      </fieldset>

      {regle === "plafond" && (
        <div className="max-w-xs space-y-1.5">
          <label htmlFor="plafond" className="text-sm font-medium">
            Montant maximum par dépense
          </label>
          <MoneyInput id="plafond" name="montant" value={montant} onChange={setMontant} className={classeChamp()} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="h-11 cursor-pointer rounded-md border border-border bg-surface-200 px-4 font-medium hover:bg-surface-100 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {etat.erreur && <p className="text-sm text-danger">{etat.erreur}</p>}
      </div>
    </form>
  );
}
