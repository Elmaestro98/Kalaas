"use client";

import { useActionState } from "react";
import { enregistrerMatiere, type EtatMatiere } from "../subject-actions";
import { classeChamp } from "@/components/ui/field";

export type ValeursMatiere = {
  id?: string;
  intitule: string;
  code: string;
  volumeHoraire: string;
  heuresCM: string;
  heuresTD: string;
  heuresTP: string;
  coefficient: string;
  credits: string;
  semestre: string;
  ueId: string;
  enseignantHabituelId: string;
};

type SubjectFormProps = {
  formationId: string;
  lmd: boolean;
  enseignants: { id: string; nom: string }[];
  ues: { id: string; libelle: string }[];
  valeurs?: ValeursMatiere;
};

const etatInitial: EtatMatiere = { erreur: null, succes: 0 };

const VIDE: ValeursMatiere = {
  intitule: "",
  code: "",
  volumeHoraire: "",
  heuresCM: "",
  heuresTD: "",
  heuresTP: "",
  coefficient: "",
  credits: "",
  semestre: "",
  ueId: "",
  enseignantHabituelId: "",
};

function Champ({
  nom,
  label,
  defaut,
  type = "text",
  placeholder,
  requis,
}: {
  nom: keyof ValeursMatiere;
  label: string;
  defaut: string;
  type?: string;
  placeholder?: string;
  requis?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium">
        {label}
        {requis && <span className="text-danger"> *</span>}
      </span>
      <input
        name={nom}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={type === "number" ? 0 : undefined}
        required={requis}
        defaultValue={defaut}
        placeholder={placeholder}
        className={`${classeChamp()} h-10`}
      />
    </label>
  );
}

export default function SubjectForm({ formationId, lmd, enseignants, ues, valeurs = VIDE }: SubjectFormProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerMatiere, etatInitial);
  const edition = Boolean(valeurs.id);

  return (
    // key : en création, le formulaire se vide après chaque matière ajoutée
    <form key={edition ? valeurs.id : etat.succes} action={envoyer} className="space-y-3">
      <input type="hidden" name="formationId" value={formationId} />
      {valeurs.id && <input type="hidden" name="id" value={valeurs.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_6rem_5rem]">
        <Champ nom="intitule" label="Intitulé" defaut={valeurs.intitule} placeholder="Ex. Algorithmique" requis />
        <Champ nom="code" label="Code" defaut={valeurs.code} placeholder="INF101" />
        <Champ nom="volumeHoraire" label="Volume (h)" defaut={valeurs.volumeHoraire} type="number" placeholder="45" />
        <Champ nom="coefficient" label="Coef." defaut={valeurs.coefficient} type="number" placeholder="1" />
      </div>

      {lmd && (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <Champ nom="heuresCM" label="CM (h)" defaut={valeurs.heuresCM} type="number" />
            <Champ nom="heuresTD" label="TD (h)" defaut={valeurs.heuresTD} type="number" />
            <Champ nom="heuresTP" label="TP (h)" defaut={valeurs.heuresTP} type="number" />
            <Champ nom="credits" label="Crédits" defaut={valeurs.credits} type="number" />
            <Champ nom="semestre" label="Semestre" defaut={valeurs.semestre} type="number" placeholder="1" />
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Unité d&apos;enseignement (UE)</span>
            <select name="ueId" defaultValue={valeurs.ueId} className={`${classeChamp()} h-10`}>
              <option value="">Aucune UE</option>
              {ues.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.libelle}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-medium">Professeur habituel</span>
        <select name="enseignantHabituelId" defaultValue={valeurs.enseignantHabituelId} className={`${classeChamp()} h-10`}>
          <option value="">Aucun</option>
          {enseignants.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
      </label>

      {etat.erreur && <p className="text-sm text-danger">{etat.erreur}</p>}
      {edition && etat.succes > 0 && !etat.erreur && <p className="text-sm text-success">Matière enregistrée.</p>}

      <button
        type="submit"
        disabled={enCours}
        className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : edition ? "Enregistrer" : "Ajouter la matière"}
      </button>
    </form>
  );
}
