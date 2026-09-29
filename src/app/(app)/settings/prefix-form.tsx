"use client";

import { useActionState, useState } from "react";
import { modifierPrefixeMatricule, type EtatPrefixe } from "./actions";
import { classeChamp } from "@/components/ui/field";
import { formaterMatricule } from "@/lib/lmd";

const etatInitial: EtatPrefixe = { erreur: null, succes: false };

export default function PrefixForm({ prefixeActuel }: { prefixeActuel: string }) {
  const [etat, envoyer, enCours] = useActionState(modifierPrefixeMatricule, etatInitial);
  const [prefixe, setPrefixe] = useState(prefixeActuel);

  const apercu = /^[A-Z0-9]{2,6}$/.test(prefixe)
    ? formaterMatricule(prefixe, new Date().getFullYear(), 1)
    : "—";

  return (
    <form action={envoyer} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <label htmlFor="prefixeMatricule" className="text-sm font-medium">
          Préfixe
        </label>
        <input
          id="prefixeMatricule"
          name="prefixeMatricule"
          maxLength={6}
          value={prefixe}
          onChange={(e) => setPrefixe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          aria-invalid={!!etat.erreur || undefined}
          className={`${classeChamp(etat.erreur ?? undefined)} w-36 font-mono uppercase`}
        />
      </div>
      <p className="text-sm text-ink-muted sm:pb-3">
        Aperçu : <b className="font-mono text-ink">{apercu}</b>
      </p>
      <button
        type="submit"
        disabled={enCours || prefixe === prefixeActuel}
        className="h-11 cursor-pointer rounded-md border border-border bg-surface-200 px-4 font-medium hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
      >
        Enregistrer
      </button>
      {etat.erreur && <p className="text-sm text-danger sm:basis-full">{etat.erreur}</p>}
      {etat.succes && <p className="text-sm text-success sm:basis-full">Préfixe enregistré.</p>}
    </form>
  );
}
