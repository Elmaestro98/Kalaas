"use client";

import { useActionState, useState } from "react";
import { creerAnneeAcademique, type EtatAnnee } from "./actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import { libelleAnnee } from "@/lib/lmd";

const etatInitial: EtatAnnee = { erreurs: {}, erreurGenerale: null, succes: false };

type AcademicYearFormProps = {
  anneeProposee: number;
  premiereAnnee: boolean;
};

export default function AcademicYearForm({ anneeProposee, premiereAnnee }: AcademicYearFormProps) {
  const [etat, envoyer, enCours] = useActionState(creerAnneeAcademique, etatInitial);
  const [debut, setDebut] = useState(anneeProposee);

  const erreurs = etat.erreurs;

  return (
    <form action={envoyer} className="space-y-4 rounded-md bg-surface-100 p-4">
      <p className="text-sm font-semibold">Ajouter une année académique</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="libelle" label="Année" required error={erreurs.libelle}>
          <input
            id="libelle"
            name="libelle"
            required
            value={libelleAnnee(debut)}
            onChange={(e) => {
              const annee = Number(e.target.value.slice(0, 4));
              if (annee > 2000) setDebut(annee);
            }}
            aria-invalid={!!erreurs.libelle || undefined}
            aria-describedby={idDescription("libelle", erreurs.libelle)}
            className={classeChamp(erreurs.libelle)}
          />
        </Field>
        <Field id="dateDebut" label="Début" required error={erreurs.dateDebut}>
          <input
            id="dateDebut"
            name="dateDebut"
            type="date"
            required
            key={`d-${debut}`}
            defaultValue={`${debut}-10-01`}
            className={classeChamp(erreurs.dateDebut)}
          />
        </Field>
        <Field id="dateFin" label="Fin" required error={erreurs.dateFin}>
          <input
            id="dateFin"
            name="dateFin"
            type="date"
            required
            key={`f-${debut}`}
            defaultValue={`${debut + 1}-07-31`}
            className={classeChamp(erreurs.dateFin)}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enCours"
          defaultChecked={premiereAnnee}
          className="size-4 accent-navy-900"
        />
        C&apos;est l&apos;année en cours
      </label>

      {etat.erreurGenerale && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : "Ajouter l'année"}
      </button>
    </form>
  );
}
