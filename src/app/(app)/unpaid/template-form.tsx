"use client";

import { useActionState, useState } from "react";
import { enregistrerModele, type EtatModele } from "./actions";
import { rendreMessage, type Declencheur } from "@/lib/relances";

type TemplateFormProps = {
  declencheur: Declencheur;
  label: string;
  description: string;
  contenu: string;
  exemple: Record<string, string>;
};

const etatInitial: EtatModele = { erreur: null, succes: false };

export default function TemplateForm({ declencheur, label, description, contenu, exemple }: TemplateFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerModele, etatInitial);
  const [texte, setTexte] = useState(contenu);

  return (
    <form action={envoyer} className="rounded-lg border border-border bg-surface-200 p-5">
      <input type="hidden" name="declencheur" value={declencheur} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <p className="text-xs text-ink-muted">{description}</p>
      </div>

      <label htmlFor={`modele-${declencheur}`} className="sr-only">
        Message {label}
      </label>
      <textarea
        id={`modele-${declencheur}`}
        name="contenu"
        rows={4}
        maxLength={1000}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        className="mt-3 w-full rounded-sm border border-border bg-surface-200 p-3 text-sm text-ink outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-100"
      />

      <p className="mt-2 text-xs font-medium text-ink-muted">Aperçu</p>
      <p className="mt-1 rounded-md bg-success-soft px-3 py-2 text-sm whitespace-pre-line text-ink">
        {rendreMessage(texte, exemple)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours || texte === contenu}
          className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {etat.erreur && <span className="text-sm text-danger">{etat.erreur}</span>}
        {etat.succes && texte === contenu && <span className="text-sm text-success">Modèle enregistré.</span>}
      </div>
    </form>
  );
}
