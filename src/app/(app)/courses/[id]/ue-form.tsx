"use client";

import { useActionState } from "react";
import { enregistrerUE, type EtatUE } from "../subject-actions";
import { classeChamp } from "@/components/ui/field";

type ValeursUE = { id?: string; code: string; intitule: string; semestre: string; credits: string };

const etatInitial: EtatUE = { erreur: null, succes: 0 };
const VIDE: ValeursUE = { code: "", intitule: "", semestre: "", credits: "" };

export default function UEForm({ formationId, valeurs = VIDE }: { formationId: string; valeurs?: ValeursUE }) {
  const [etat, envoyer, enCours] = useActionState(enregistrerUE, etatInitial);
  const edition = Boolean(valeurs.id);

  return (
    <form key={edition ? valeurs.id : etat.succes} action={envoyer} className="space-y-3">
      <input type="hidden" name="formationId" value={formationId} />
      {valeurs.id && <input type="hidden" name="id" value={valeurs.id} />}
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <label className="space-y-1">
          <span className="text-xs font-medium">Code</span>
          <input name="code" maxLength={20} defaultValue={valeurs.code} placeholder="UE1" className={`${classeChamp()} h-10`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">
            Intitulé<span className="text-danger"> *</span>
          </span>
          <input
            name="intitule"
            required
            maxLength={80}
            defaultValue={valeurs.intitule}
            placeholder="Informatique fondamentale"
            className={`${classeChamp()} h-10`}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium">Semestre</span>
          <input name="semestre" type="number" min={1} max={12} defaultValue={valeurs.semestre} placeholder="1" className={`${classeChamp()} h-10`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Crédits ECTS</span>
          <input name="credits" type="number" min={0} max={60} defaultValue={valeurs.credits} placeholder="6" className={`${classeChamp()} h-10`} />
        </label>
      </div>
      {etat.erreur && <p className="text-sm text-danger">{etat.erreur}</p>}
      {edition && etat.succes > 0 && !etat.erreur && <p className="text-sm text-success">UE enregistrée.</p>}
      <button
        type="submit"
        disabled={enCours}
        className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : edition ? "Enregistrer" : "Ajouter l'UE"}
      </button>
    </form>
  );
}
