"use client";

import { useActionState, useState } from "react";
import { annulerDepense, type EtatAnnulationDepense } from "./actions";
import { classeChamp } from "@/components/ui/field";

const etatInitial: EtatAnnulationDepense = { erreur: null };

export default function CancelExpense({ depenseId }: { depenseId: string }) {
  const [etat, envoyer, enCours] = useActionState(annulerDepense, etatInitial);
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="cursor-pointer text-xs font-medium text-danger hover:underline"
      >
        Annuler
      </button>
    );
  }

  return (
    <form action={envoyer} className="mt-3 w-full space-y-2 rounded-lg border border-danger/40 bg-danger-soft p-3">
      <input type="hidden" name="depenseId" value={depenseId} />
      <label htmlFor={`motif-${depenseId}`} className="block text-sm font-medium">
        Motif de l&apos;annulation<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
      </label>
      <input
        id={`motif-${depenseId}`}
        name="motif"
        required
        minLength={3}
        maxLength={200}
        placeholder="Ex. Saisie en double, erreur de montant…"
        className={classeChamp(etat.erreur ?? undefined)}
      />
      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="h-9 cursor-pointer rounded-md border border-border bg-surface-200 px-3 text-sm font-medium"
        >
          Garder
        </button>
        <button
          type="submit"
          disabled={enCours}
          className="h-9 cursor-pointer rounded-md bg-danger px-3 text-sm font-medium text-on-danger disabled:opacity-60"
        >
          {enCours ? "Annulation…" : "Confirmer l'annulation"}
        </button>
      </div>
    </form>
  );
}
