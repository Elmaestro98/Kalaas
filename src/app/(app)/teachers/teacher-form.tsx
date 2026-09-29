"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { enregistrerEnseignant, type EtatEnseignant } from "./actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import type { StatutEnseignantSaisie } from "@/lib/enseignants";

export type ValeursEnseignant = {
  id?: string;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  specialite: string;
  statut: StatutEnseignantSaisie;
  tarifHoraire: number;
  membreId: string;
};

type TeacherFormProps = {
  valeurs: ValeursEnseignant;
  comptes: { id: string; nom: string }[];
};

const etatInitial: EtatEnseignant = { erreurs: {}, erreurGenerale: null, succes: false };

const AIDE_COMPTE =
  "Facultatif : s'il a un compte Kalaas (rôle Formateur), il verra lui-même sa programmation en se connectant.";
const AIDE_TARIF = "Facultatif · servira au calcul de la paie des vacataires";

export default function TeacherForm({ valeurs, comptes }: TeacherFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerEnseignant, etatInitial);
  const [v, setV] = useState(valeurs);
  const erreurs = etat.erreurs;

  function champ<K extends keyof ValeursEnseignant>(cle: K, valeur: ValeursEnseignant[K]) {
    setV((ancien) => ({ ...ancien, [cle]: valeur }));
  }

  function texte(
    id: "prenom" | "nom" | "email" | "specialite",
    label: string,
    options: { requis?: boolean; type?: string; placeholder?: string; max?: number } = {},
  ) {
    return (
      <Field id={id} label={label} required={options.requis} error={erreurs[id]}>
        <input
          id={id}
          name={id}
          type={options.type ?? "text"}
          required={options.requis}
          maxLength={options.max ?? 60}
          placeholder={options.placeholder}
          autoComplete="off"
          value={v[id]}
          onChange={(e) => champ(id, e.target.value)}
          aria-invalid={!!erreurs[id] || undefined}
          aria-describedby={idDescription(id, erreurs[id])}
          className={classeChamp(erreurs[id])}
        />
      </Field>
    );
  }

  return (
    <form action={envoyer} className="space-y-6">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        {texte("prenom", "Prénom", { requis: true })}
        {texte("nom", "Nom", { requis: true })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="telephone" label="Téléphone WhatsApp" error={erreurs.telephone}>
          <input
            id="telephone"
            name="telephone"
            type="tel"
            inputMode="tel"
            placeholder="77 123 45 67"
            value={v.telephone}
            onChange={(e) => champ("telephone", e.target.value)}
            aria-invalid={!!erreurs.telephone || undefined}
            aria-describedby={idDescription("telephone", erreurs.telephone)}
            className={classeChamp(erreurs.telephone)}
          />
        </Field>
        {texte("email", "E-mail", { type: "email", max: 120 })}
      </div>

      {texte("specialite", "Spécialité", { placeholder: "Ex. Informatique, Réseaux, Comptabilité", max: 80 })}

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">
            Statut<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(["PERMANENT", "VACATAIRE"] as const).map((s) => (
              <label
                key={s}
                className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
                  v.statut === s
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-border bg-surface-200 hover:bg-surface-100"
                }`}
              >
                <input
                  type="radio"
                  name="statut"
                  value={s}
                  checked={v.statut === s}
                  onChange={() => champ("statut", s)}
                  className="sr-only"
                />
                {s === "PERMANENT" ? "Permanent" : "Vacataire"}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="tarifHoraire" label="Tarif horaire" hint={AIDE_TARIF} error={erreurs.tarifHoraire}>
          <MoneyInput
            id="tarifHoraire"
            name="tarifHoraire"
            value={v.tarifHoraire}
            onChange={(n) => champ("tarifHoraire", n)}
            invalid={!!erreurs.tarifHoraire}
            describedBy={idDescription("tarifHoraire", erreurs.tarifHoraire, AIDE_TARIF)}
            className={classeChamp(erreurs.tarifHoraire)}
          />
        </Field>
      </div>

      <Field id="membreId" label="Compte Kalaas" hint={AIDE_COMPTE} error={erreurs.membreId}>
        <select
          id="membreId"
          name="membreId"
          value={v.membreId}
          onChange={(e) => champ("membreId", e.target.value)}
          aria-describedby={idDescription("membreId", erreurs.membreId, AIDE_COMPTE)}
          className={classeChamp(erreurs.membreId)}
        >
          <option value="">Pas de compte</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </Field>

      {etat.erreurGenerale && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}
      {etat.succes && <p className="text-sm text-success">Fiche enregistrée.</p>}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        {!v.id && (
          <Link
            href="/teachers"
            className="flex h-12 items-center justify-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100"
          >
            Annuler
          </Link>
        )}
        <button
          type="submit"
          disabled={enCours}
          className="h-12 cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : v.id ? "Enregistrer les modifications" : "Ajouter le professeur"}
        </button>
      </div>
    </form>
  );
}
