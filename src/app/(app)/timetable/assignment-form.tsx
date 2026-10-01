"use client";

import { useActionState, useState } from "react";
import { enregistrerAffectation, type EtatAffectation } from "./assignment-actions";
import { classeChamp } from "@/components/ui/field";

type MatiereProgramme = { id: string; intitule: string; volumeHoraire: number | null; enseignantHabituelId: string | null };

type AssignmentFormProps = {
  sessionId: string;
  enseignants: { id: string; nom: string }[];
  programme: MatiereProgramme[];
};

const etatInitial: EtatAffectation = { erreur: null, succes: 0 };

export default function AssignmentForm(props: AssignmentFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerAffectation, etatInitial);
  // key : le formulaire repart à zéro après chaque affectation enregistrée
  return <Formulaire key={etat.succes} {...props} etat={etat} envoyer={envoyer} enCours={enCours} />;
}

function Formulaire({
  sessionId,
  enseignants,
  programme,
  etat,
  envoyer,
  enCours,
}: AssignmentFormProps & { etat: EtatAffectation; envoyer: (f: FormData) => void; enCours: boolean }) {
  const [matiereId, setMatiereId] = useState("");
  const [enseignantId, setEnseignantId] = useState("");
  const [volume, setVolume] = useState("");

  // Choisir une matière propose son professeur habituel et son volume prévu au programme
  function choisirMatiere(id: string) {
    setMatiereId(id);
    const m = programme.find((x) => x.id === id);
    if (m?.enseignantHabituelId) setEnseignantId(m.enseignantHabituelId);
    setVolume(m?.volumeHoraire ? String(m.volumeHoraire) : "");
  }

  return (
    <form
      action={envoyer}
      className="grid gap-3 rounded-md bg-surface-100 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto] lg:items-end"
    >
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="space-y-1">
        <label htmlFor="aff-matiere" className="text-xs font-medium">
          Matière du programme
        </label>
        <select
          id="aff-matiere"
          name="matiereId"
          required
          value={matiereId}
          onChange={(e) => choisirMatiere(e.target.value)}
          className={classeChamp()}
        >
          <option value="" disabled>
            Choisir…
          </option>
          {programme.map((m) => (
            <option key={m.id} value={m.id}>
              {m.intitule}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="aff-prof" className="text-xs font-medium">
          Professeur
        </label>
        <select
          id="aff-prof"
          name="enseignantId"
          required
          value={enseignantId}
          onChange={(e) => setEnseignantId(e.target.value)}
          className={classeChamp()}
        >
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
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className={classeChamp()}
        />
      </div>

      <button
        type="submit"
        disabled={enCours || enseignants.length === 0 || programme.length === 0}
        className="h-11 cursor-pointer rounded-md bg-action px-4 font-medium whitespace-nowrap text-on-action hover:bg-action-hover disabled:opacity-60 sm:col-span-2 lg:col-span-1"
      >
        {enCours ? "…" : "Affecter"}
      </button>

      {etat.erreur && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{etat.erreur}</p>}
    </form>
  );
}
