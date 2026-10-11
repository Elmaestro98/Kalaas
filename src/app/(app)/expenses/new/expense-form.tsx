"use client";

import { startTransition, useActionState, useState } from "react";
import { enregistrerDepense, type EtatDepense } from "../actions";
import Field, { classeChamp } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatFcfa } from "@/lib/format";
import { CATEGORIES_DEPENSE } from "@/lib/depenses";
import { MODES_PAIEMENT, referenceObligatoire, type ModePaiementSaisie } from "@/lib/paiements";

const etatInitial: EtatDepense = { erreurs: {}, erreurGenerale: null };

export default function ExpenseForm({ aujourdhui }: { aujourdhui: string }) {
  const [etat, envoyer, enCours] = useActionState(enregistrerDepense, etatInitial);
  const [montant, setMontant] = useState(0);
  const [mode, setMode] = useState<ModePaiementSaisie>("ESPECES");
  // Envoi manuel (onSubmit) : avec <form action>, React 19 vide le formulaire après chaque envoi,
  // même en cas d'erreur, et la liste des catégories reviendrait à « Choisir… »
  const [categorie, setCategorie] = useState("");
  const [date, setDate] = useState(aujourdhui);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const { erreurs } = etat;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="space-y-6"
    >
      <Field id="montant" label="Montant payé" required error={erreurs.montant}>
        <MoneyInput
          id="montant"
          name="montant"
          value={montant}
          onChange={setMontant}
          required
          invalid={!!erreurs.montant}
          className={`${classeChamp(erreurs.montant)} h-14 text-xl font-semibold`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="categorie" label="Catégorie" required error={erreurs.categorie}>
          <select
            id="categorie"
            name="categorie"
            required
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className={classeChamp(erreurs.categorie)}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {CATEGORIES_DEPENSE.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="date" label="Date" required error={erreurs.date}>
          <input
            id="date"
            name="date"
            type="date"
            required
            max={aujourdhui}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={classeChamp(erreurs.date)}
          />
        </Field>
      </div>

      <Field id="description" label="Description" required error={erreurs.description}>
        <input
          id="description"
          name="description"
          required
          minLength={3}
          maxLength={200}
          placeholder="Ex. Loyer d'octobre, facture Senelec…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={classeChamp(erreurs.description)}
        />
      </Field>

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
        <Field id="reference" label="Référence de la transaction" required error={erreurs.reference}>
          <input
            id="reference"
            name="reference"
            required
            maxLength={60}
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className={`${classeChamp(erreurs.reference)} font-mono uppercase`}
          />
        </Field>
      ) : (
        <input type="hidden" name="reference" value="" />
      )}

      {etat.erreurGenerale && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || montant <= 0}
        className="h-12 cursor-pointer rounded-md bg-gold-500 px-6 font-semibold text-navy-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : `Enregistrer ${formatFcfa(montant)}`}
      </button>
    </form>
  );
}
