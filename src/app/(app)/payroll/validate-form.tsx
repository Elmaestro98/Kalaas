"use client";

import { useActionState, useState } from "react";
import { validerVacation, type EtatValidation } from "./actions";
import { classeChamp } from "@/components/ui/field";
import { formatFcfa } from "@/lib/format";
import { lireAjustement } from "@/lib/paie";

const etatInitial: EtatValidation = { erreurs: {}, erreurGenerale: null };

type ValidateFormProps = {
  enseignantId: string;
  mois: string;
  brut: number;
};

export default function ValidateForm({ enseignantId, mois, brut }: ValidateFormProps) {
  const [etat, envoyer, enCours] = useActionState(validerVacation, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");

  const ajustement = lireAjustement(saisie);
  const net = ajustement === null ? null : brut + ajustement;

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover"
      >
        Valider le bulletin
      </button>
    );
  }

  return (
    <form action={envoyer} className="mt-3 w-full space-y-3 rounded-lg border border-border bg-surface-100 p-4">
      <input type="hidden" name="enseignantId" value={enseignantId} />
      <input type="hidden" name="mois" value={mois} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`ajustement-${enseignantId}`} className="text-sm font-medium">
            Retenue ou prime (FCFA)
          </label>
          <input
            id={`ajustement-${enseignantId}`}
            name="ajustement"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex. -20000 (avance) ou 5000"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            className={`${classeChamp(etat.erreurs.ajustement)} text-right tabular-nums`}
          />
          {etat.erreurs.ajustement ? (
            <p className="text-sm text-danger">{etat.erreurs.ajustement}</p>
          ) : (
            <p className="text-xs text-ink-muted">Laisser vide s&apos;il n&apos;y a rien à ajuster.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`motif-${enseignantId}`} className="text-sm font-medium">
            Motif
          </label>
          <input
            id={`motif-${enseignantId}`}
            name="motif"
            maxLength={200}
            placeholder="Ex. Avance du 12 octobre"
            className={classeChamp(etat.erreurs.motif)}
          />
          {etat.erreurs.motif && <p className="text-sm text-danger">{etat.erreurs.motif}</p>}
        </div>
      </div>

      <p className="text-sm">
        Net à payer :{" "}
        <span className={`font-bold tabular-nums ${net !== null && net < 0 ? "text-danger" : ""}`}>
          {net === null ? "—" : formatFcfa(net)}
        </span>
      </p>

      {etat.erreurGenerale && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="h-10 cursor-pointer rounded-md border border-border bg-surface-200 px-4 text-sm font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={enCours}
          className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
        >
          {enCours ? "Validation…" : "Confirmer"}
        </button>
      </div>
    </form>
  );
}
