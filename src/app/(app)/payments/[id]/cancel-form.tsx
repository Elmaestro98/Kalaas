"use client";

import { useActionState, useState } from "react";
import { annulerPaiement, type EtatAnnulation } from "../actions";
import { classeChamp } from "@/components/ui/field";

const etatInitial: EtatAnnulation = { erreur: null };

export default function CancelForm({ paiementId }: { paiementId: string }) {
  const [etat, envoyer, enCours] = useActionState(annulerPaiement, etatInitial);
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="cursor-pointer text-sm font-medium text-danger hover:underline"
      >
        Erreur ? Annuler ce paiement
      </button>
    );
  }

  return (
    <form action={envoyer} className="space-y-3 rounded-lg border border-danger/40 bg-danger-soft p-4">
      <input type="hidden" name="paiementId" value={paiementId} />
      <p className="text-sm font-semibold text-danger">Annuler ce paiement</p>
      <p className="text-xs text-ink-muted">
        Le paiement n&apos;est pas supprimé : il reste visible, marqué « annulé », et les échéances
        redeviennent dues. L&apos;annulation est tracée à votre nom.
      </p>
      <label htmlFor="motif" className="block text-sm font-medium">
        Motif<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
      </label>
      <input
        id="motif"
        name="motif"
        required
        minLength={3}
        maxLength={200}
        placeholder="Ex. Erreur de montant, doublon…"
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
          className="h-10 cursor-pointer rounded-md border border-border bg-surface-200 px-4 text-sm font-medium"
        >
          Garder le paiement
        </button>
        <button
          type="submit"
          disabled={enCours}
          className="h-10 cursor-pointer rounded-md bg-danger px-4 text-sm font-medium text-on-danger disabled:opacity-60"
        >
          {enCours ? "Annulation…" : "Confirmer l'annulation"}
        </button>
      </div>
    </form>
  );
}
