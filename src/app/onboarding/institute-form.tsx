
"use client";

import { useActionState } from "react";
import { creerInstitut, type EtatFormulaire } from "./actions"

const etatInitial: EtatFormulaire = { erreur: null };

const classeChamp =
  "h-11 w-full rounded-sm border border-border bg-surface-200 px-3 text-ink outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-100";

export default function InstituteForm() {
  const [etat, envoyer, enCours] = useActionState(creerInstitut, etatInitial);

  return (
    <form action={envoyer} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="nom" className="text-sm font-medium">
          Nom de l&apos;institut <span className="text-danger">*</span>
        </label>
        <input id="nom" name="nom" required placeholder="Ex. Institut Excellence" className={classeChamp} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ville" className="text-sm font-medium">
          Ville <span className="text-danger">*</span>
        </label>
        <input id="ville" name="ville" required placeholder="Ex. Saint-Louis" className={classeChamp} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="telephone" className="text-sm font-medium">
          Numéro WhatsApp de l&apos;institut <span className="text-danger">*</span>
        </label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-sm border border-border bg-surface-100 px-3 font-medium">
            +221
          </span>
          <input id="telephone" name="telephone" type="tel" required placeholder="77 123 45 67" className={classeChamp} />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-border bg-surface-200 p-5">
        <legend className="px-1 font-semibold">Mentions légales (facultatif)</legend>
        <div className="space-y-1.5">
          <label htmlFor="adresse" className="text-sm font-medium">Adresse</label>
          <input id="adresse" name="adresse" placeholder="Ex. Av. Général de Gaulle" className={classeChamp} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ninea" className="text-sm font-medium">NINEA</label>
          <input id="ninea" name="ninea" placeholder="Ex. 004589212" className={classeChamp} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rccm" className="text-sm font-medium">RCCM</label>
          <input id="rccm" name="rccm" placeholder="Ex. SN-STL-2024-B-123" className={classeChamp} />
        </div>
      </fieldset>

      {etat.erreur && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="h-12 w-full cursor-pointer rounded-md bg-action font-medium text-on-action hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
      >
        {enCours ? "Création en cours…" : "Créer mon institut"}
      </button>
    </form>
  );
}