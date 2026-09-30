"use client";

import { useActionState, useState } from "react";
import { inviterMembre, type EtatInvitation } from "./actions";
import Field, { classeChamp } from "@/components/ui/field";

type Role = "DIRECTEUR" | "CAISSIER" | "FORMATEUR";

const CHOIX: { valeur: Role; label: string; detail: string }[] = [
  { valeur: "CAISSIER", label: "Caissier / Scolarité", detail: "Inscriptions, encaissements, reçus, relances" },
  { valeur: "FORMATEUR", label: "Formateur", detail: "Sa semaine de cours et les présences" },
  { valeur: "DIRECTEUR", label: "Directeur", detail: "Tout l'établissement, finances et équipe" },
];

const etatInitial: EtatInvitation = { erreur: null, succes: null, compteur: 0 };

export default function InviteForm({ fiches }: { fiches: { id: string; nom: string }[] }) {
  const [etat, envoyer, enCours] = useActionState(inviterMembre, etatInitial);
  const [role, setRole] = useState<Role>("CAISSIER");

  return (
    // key : le formulaire se vide après chaque invitation envoyée
    <form key={etat.compteur} action={envoyer} className="space-y-4">
      <Field id="email" label="Adresse e-mail" required>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="prenom.nom@exemple.com"
          className={classeChamp(etat.erreur ?? undefined)}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Rôle</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHOIX.map((c) => (
            <label
              key={c.valeur}
              className={`flex cursor-pointer flex-col rounded-md border p-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
                role === c.valeur
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-border bg-surface-200 hover:bg-surface-100"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={c.valeur}
                checked={role === c.valeur}
                onChange={() => setRole(c.valeur)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{c.label}</span>
              <span className={`text-xs ${role === c.valeur ? "text-white/70" : "text-ink-muted"}`}>{c.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {role === "FORMATEUR" && (
        <Field
          id="enseignantId"
          label="Fiche professeur"
          hint="Son compte sera relié à cette fiche : il verra sa programmation en se connectant."
        >
          <select id="enseignantId" name="enseignantId" defaultValue="" className={classeChamp()}>
            <option value="">Aucune pour l&apos;instant</option>
            {fiches.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </Field>
      )}

      {etat.erreur && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreur}
        </p>
      )}
      {etat.succes && <p className="rounded-sm bg-success-soft px-4 py-3 text-sm text-success">{etat.succes}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="h-11 w-full cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:opacity-60 sm:w-auto"
      >
        {enCours ? "Envoi…" : "Envoyer l'invitation"}
      </button>
    </form>
  );
}
