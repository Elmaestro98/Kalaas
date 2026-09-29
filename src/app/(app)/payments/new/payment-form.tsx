"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { enregistrerPaiement, type EtatPaiement } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatDate, formatFcfa } from "@/lib/format";
import {
  MODES_PAIEMENT,
  referenceObligatoire,
  repartirPaiement,
  type ModePaiementSaisie,
} from "@/lib/paiements";

export type EcheancePayable = {
  id: string;
  libelle: string;
  formation: string;
  dateLimite: string;
  ordre: number;
  reste: number;
};

type PaymentFormProps = {
  apprenantId: string;
  echeances: EcheancePayable[];
  enRetard: number;
  caissier: string;
};

const etatInitial: EtatPaiement = { erreurs: {}, erreurGenerale: null };

const AIDE_REFERENCE = "Copiez la référence du SMS de confirmation";

const LABEL_REFERENCE: Record<ModePaiementSaisie, string> = {
  ESPECES: "",
  WAVE: "Référence Wave",
  ORANGE_MONEY: "Référence Orange Money",
  VIREMENT: "Référence du virement",
};

export default function PaymentForm({ apprenantId, echeances, enRetard, caissier }: PaymentFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerPaiement, etatInitial);

  const resteTotal = echeances.reduce((s, e) => s + e.reste, 0);
  const prochaine = echeances[0];

  const [montant, setMontant] = useState(enRetard > 0 ? enRetard : (prochaine?.reste ?? 0));
  const [mode, setMode] = useState<ModePaiementSaisie>("ESPECES");
  const [reference, setReference] = useState("");
  const [recu, setRecu] = useState(0);
  const [note, setNote] = useState("");

  const erreurs = etat.erreurs;
  const { affectations, nonAffecte } = repartirPaiement(echeances, montant);
  const rendu = recu > montant ? recu - montant : 0;

  const raccourcis = [
    enRetard > 0 && { label: "En retard", valeur: enRetard },
    prochaine && enRetard === 0 && { label: "Prochaine échéance", valeur: prochaine.reste },
    { label: "Tout le solde", valeur: resteTotal },
  ].filter((r): r is { label: string; valeur: number } => Boolean(r));

  return (
    <form action={envoyer} className="space-y-6">
      <input type="hidden" name="apprenantId" value={apprenantId} />

      <Field id="montant" label="Montant reçu" required error={erreurs.montant}>
        <MoneyInput
          id="montant"
          name="montant"
          required
          value={montant}
          onChange={setMontant}
          invalid={!!erreurs.montant}
          describedBy={idDescription("montant", erreurs.montant)}
          className={`${classeChamp(erreurs.montant)} h-14 text-xl font-semibold`}
        />
      </Field>
      <div className="-mt-3 flex flex-wrap gap-2">
        {raccourcis.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setMontant(r.valeur)}
            aria-pressed={montant === r.valeur}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
              montant === r.valeur
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-border bg-surface-200 text-ink hover:bg-surface-100"
            }`}
          >
            {r.label} · {formatFcfa(r.valeur)}
          </button>
        ))}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Moyen de paiement<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES_PAIEMENT.map((m) => (
            <label
              key={m.valeur}
              className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
                mode === m.valeur
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-border bg-surface-200 text-ink hover:bg-surface-100"
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
        {erreurs.mode && <p className="mt-1.5 text-sm text-danger">{erreurs.mode}</p>}
      </fieldset>

      {referenceObligatoire(mode) ? (
        <Field
          id="reference"
          label={LABEL_REFERENCE[mode]}
          required
          hint={AIDE_REFERENCE}
          error={erreurs.reference}
        >
          <input
            id="reference"
            name="reference"
            required
            maxLength={60}
            autoComplete="off"
            placeholder="Ex. T26110412A8F"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            aria-invalid={!!erreurs.reference || undefined}
            aria-describedby={idDescription("reference", erreurs.reference, AIDE_REFERENCE)}
            className={`${classeChamp(erreurs.reference)} font-mono uppercase`}
          />
        </Field>
      ) : (
        <>
          <input type="hidden" name="reference" value="" />
          <div className="grid gap-4 rounded-md bg-surface-100 p-4 sm:grid-cols-2">
            <Field id="recu" label="Billets reçus (facultatif)">
              <MoneyInput
                id="recu"
                name="billetsRecus"
                value={recu}
                onChange={setRecu}
                className={classeChamp()}
              />
            </Field>
            <div>
              <p className="text-sm font-medium">À rendre</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{formatFcfa(rendu)}</p>
            </div>
          </div>
        </>
      )}

      <Field id="note" label="Note (facultatif)" error={erreurs.note}>
        <input
          id="note"
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={classeChamp(erreurs.note)}
        />
      </Field>

      <div className="rounded-lg border border-gold-500/40 bg-gold-100 p-4 text-sm" aria-live="polite">
        <p className="flex justify-between text-xs font-semibold uppercase tracking-wider text-gold-700">
          <span>Ce paiement règle</span>
          <span className="normal-case tracking-normal">la plus ancienne d&apos;abord</span>
        </p>
        {affectations.length === 0 ? (
          <p className="mt-2 text-ink-muted">Saisissez un montant.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {affectations.map((a) => {
              const e = echeances.find((x) => x.id === a.echeanceId)!;
              const complete = a.montant >= e.reste;
              return (
                <li key={a.echeanceId} className="flex justify-between gap-3">
                  <span>
                    {e.libelle}{" "}
                    <span className="text-ink-muted">
                      · {formatDate(new Date(e.dateLimite))} · {complete ? "soldée" : "partiel"}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatFcfa(a.montant)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {nonAffecte > 0 && (
          <p className="mt-2 font-medium text-danger">
            {formatFcfa(nonAffecte)} de trop : le montant dépasse le reste à payer.
          </p>
        )}
        <p className="mt-3 flex justify-between border-t border-gold-500/40 pt-2">
          <span>Reste après ce paiement</span>
          <b className="tabular-nums">{formatFcfa(Math.max(0, resteTotal - montant))}</b>
        </p>
      </div>

      {etat.erreurGenerale && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <span className="text-xs text-ink-muted sm:flex-1">Encaissé par {caissier}</span>
        <Link
          href="/payments/new"
          className="flex h-12 items-center justify-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100"
        >
          Retour
        </Link>
        <button
          type="submit"
          disabled={enCours || montant <= 0 || nonAffecte > 0}
          className="h-12 cursor-pointer rounded-md bg-gold-500 px-6 font-semibold text-navy-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "Encaissement…" : `Encaisser ${formatFcfa(montant)}`}
        </button>
      </div>
    </form>
  );
}
