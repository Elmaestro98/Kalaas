"use client";

import { startTransition, useActionState, useState } from "react";
import { modifierEtablissement, type ChampEtablissement, type EtatEtablissement } from "./actions";
import Field, { classeChamp } from "@/components/ui/field";
import { ORDRE_TYPES, TYPES_ETABLISSEMENT } from "@/lib/etablissement";

const etatInitial: EtatEtablissement = { erreurs: {}, erreurGenerale: null };

type Valeurs = Record<ChampEtablissement, string>;

export default function EstablishmentForm({ valeursInitiales }: { valeursInitiales: Valeurs }) {
  const [etat, envoyer, enCours] = useActionState(modifierEtablissement, etatInitial);
  const [v, setV] = useState<Valeurs>(valeursInitiales);
  const { erreurs } = etat;

  const changer = (champ: ChampEtablissement) => (e: { target: { value: string } }) =>
    setV((anciennes) => ({ ...anciennes, [champ]: e.target.value }));
  const modifie = (Object.keys(v) as ChampEtablissement[]).some((c) => v[c] !== valeursInitiales[c]);

  const coordonnees = [[v.adresse, v.ville].filter(Boolean).join(", "), v.telephone, v.telephone2].filter(Boolean).join(" · ");
  const mentions = [v.ninea && `NINEA ${v.ninea}`, v.rccm && `RCCM ${v.rccm}`].filter(Boolean).join(" · ");

  const champ = (nom: ChampEtablissement, label: string, options: { requis?: boolean; aide?: string; exemple?: string } = {}) => (
    <Field id={nom} label={label} required={options.requis} hint={options.aide} error={erreurs[nom]}>
      <input
        id={nom}
        name={nom}
        value={v[nom]}
        onChange={changer(nom)}
        required={options.requis}
        placeholder={options.exemple}
        aria-invalid={!!erreurs[nom] || undefined}
        className={classeChamp(erreurs[nom])}
      />
    </Field>
  );

  return (
    <form
      // Envoi manuel : les champs gardent leur valeur, même en cas d'erreur
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="space-y-6"
    >
      {/* Aperçu de l'en-tête tel qu'il apparaît sur les reçus et documents */}
      <div className="rounded-md border border-dashed border-border bg-surface-100 p-4">
        <p className="mb-2 text-xs font-medium text-ink-muted">Aperçu de l&apos;en-tête des reçus</p>
        <div className="flex items-start justify-between gap-4 border-b-2 border-gold-500 pb-3">
          <div className="min-w-0">
            <p className="text-lg font-bold">{v.nom || "Nom de l'établissement"}</p>
            {coordonnees && <p className="text-xs text-ink-muted">{coordonnees}</p>}
            {mentions && <p className="text-xs text-ink-muted">{mentions}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold tracking-widest text-gold-700">REÇU DE PAIEMENT</p>
            <p className="text-sm font-bold">N° REC-2026-00001</p>
          </div>
        </div>
        {v.piedRecu && <p className="mt-3 text-center text-sm italic">{v.piedRecu}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{champ("nom", "Nom de l'établissement", { requis: true })}</div>
        <div className="sm:col-span-2">
          <Field
            id="typeEtablissement"
            label="Type d'établissement"
            required
            hint={`Vocabulaire de l'interface : « ${TYPES_ETABLISSEMENT[v.typeEtablissement as keyof typeof TYPES_ETABLISSEMENT]?.apprenants ?? "Apprenants"} »`}
            error={erreurs.typeEtablissement}
          >
            <select
              id="typeEtablissement"
              name="typeEtablissement"
              value={v.typeEtablissement}
              onChange={changer("typeEtablissement")}
              required
              className={classeChamp(erreurs.typeEtablissement)}
            >
              {ORDRE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPES_ETABLISSEMENT[type].label} ({TYPES_ETABLISSEMENT[type].aide})
                </option>
              ))}
            </select>
          </Field>
        </div>
        {champ("ville", "Ville", { requis: true })}
        {champ("adresse", "Adresse", { exemple: "Ex. Sacré-Cœur 3, villa 120" })}
        {champ("telephone", "Téléphone principal", { requis: true, exemple: "77 123 45 67", aide: "Affiché sur les reçus" })}
        {champ("telephone2", "Second téléphone", { exemple: "33 800 00 00", aide: "Facultatif" })}
        {champ("ninea", "NINEA", { exemple: "Ex. 004589212" })}
        {champ("rccm", "RCCM", { exemple: "Ex. SN-DKR-2020-B-1234" })}
        <div className="sm:col-span-2">
          {champ("piedRecu", "Message en bas des reçus", {
            exemple: "Ex. Les frais de scolarité ne sont pas remboursables.",
            aide: "Facultatif · 200 caractères maximum",
          })}
        </div>
      </div>

      {etat.erreurGenerale && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || !modifie}
        className="h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
