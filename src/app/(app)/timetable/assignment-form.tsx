"use client";

import { useActionState } from "react";
import { enregistrerAffectation, type EtatAffectation } from "./assignment-actions";
import { classeChamp } from "@/components/ui/field";

type AssignmentFormProps = {
  sessionId: string;
  enseignants: { id: string; nom: string }[];
  matieres: string[];
};

const etatInitial: EtatAffectation = { erreur: null, succes: 0 };

export default function AssignmentForm({ sessionId, enseignants, matieres }: AssignmentFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerAffectation, etatInitial);

  return (
    // key : le formulaire se vide après chaque affectation enregistrée
    <form
      key={etat.succes}
      action={envoyer}
      className="grid gap-3 rounded-md bg-surface-100 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto] lg:items-end"
    >
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="space-y-1">
        <label htmlFor="aff-matiere" className="text-xs font-medium">
          Matière
        </label>
        <input
          id="aff-matiere"
          name="matiere"
          required
          maxLength={80}
          list="aff-matieres"
          autoComplete="off"
          placeholder="Ex. Algorithmique"
          className={classeChamp()}
        />
        <datalist id="aff-matieres">
          {matieres.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <label htmlFor="aff-prof" className="text-xs font-medium">
          Professeur
        </label>
        <select id="aff-prof" name="enseignantId" required defaultValue="" className={classeChamp()}>
          <option value="" disabled>
            Choisir…
          </option>
          {enseignants.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="aff-volume" className="text-xs font-medium">
          Heures prévues
        </label>
        <input
          id="aff-volume"
          name="volumeHoraire"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="—"
          className={classeChamp()}
        />
      </div>

      <button
        type="submit"
        disabled={enCours || enseignants.length === 0}
        className="h-11 cursor-pointer rounded-md bg-action px-4 font-medium whitespace-nowrap text-on-action hover:bg-action-hover disabled:opacity-60 sm:col-span-2 lg:col-span-1"
      >
        {enCours ? "…" : "Affecter"}
      </button>

      {etat.erreur && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{etat.erreur}</p>}
    </form>
  );
}
