"use client";

import { useActionState } from "react";
import { ajouterSalle, type EtatSalle } from "./actions";
import { classeChamp } from "@/components/ui/field";

const etatInitial: EtatSalle = { erreur: null, succes: 0 };

export default function RoomForm() {
  const [etat, envoyer, enCours] = useActionState(ajouterSalle, etatInitial);

  return (
    // key : le formulaire se vide après chaque salle ajoutée
    <form key={etat.succes} action={envoyer} className="flex flex-col gap-3 rounded-md bg-surface-100 p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor="nomSalle" className="text-sm font-medium">
          Nom de la salle
        </label>
        <input
          id="nomSalle"
          name="nom"
          required
          maxLength={40}
          placeholder="Ex. Salle 3, Amphi A, Labo info"
          className={classeChamp(etat.erreur ?? undefined)}
        />
      </div>
      <div className="space-y-1.5 sm:w-32">
        <label htmlFor="capaciteSalle" className="text-sm font-medium">
          Places
        </label>
        <input
          id="capaciteSalle"
          name="capacite"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="—"
          className={classeChamp()}
        />
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
      >
        Ajouter
      </button>
      {etat.erreur && <p className="text-sm text-danger sm:basis-full">{etat.erreur}</p>}
    </form>
  );
}
