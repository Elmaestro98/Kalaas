"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { creerSession, type EtatSession } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";

type OptionFormation = { id: string; intitule: string; dureeMois: number };
type OptionFormateur = { id: string; nom: string };

type SessionFormProps = {
  formations: OptionFormation[];
  formateurs: OptionFormateur[];
  formationInitiale?: string;
};

const etatInitial: EtatSession = { erreurs: {}, erreurGenerale: null };

const AIDE_FIN = "Calculée d'après la durée de la formation";
const AIDE_HORAIRES = "Ex. Lun–Ven · 18h–20h";
const AIDE_CAPACITE = "Laisser vide si pas de limite";

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

// Début + N mois, moins un jour. Ex. 2026-10-05 + 6 mois → 2027-04-04
function calculerFin(debut: string, mois: number): string {
  if (!debut || mois < 1) {
    return "";
  }
  const [annee, moisDebut, jour] = debut.split("-").map(Number);
  const fin = new Date(Date.UTC(annee, moisDebut - 1 + mois, jour - 1));
  return fin.toISOString().slice(0, 10);
}

export default function SessionForm({
  formations,
  formateurs,
  formationInitiale,
}: SessionFormProps) {
  const [etat, envoyer, enCours] = useActionState(creerSession, etatInitial);

  const [formationId, setFormationId] = useState(formationInitiale ?? "");
  const [nom, setNom] = useState("");
  const [dateDebut, setDateDebut] = useState(aujourdhui());
  const [dateFin, setDateFin] = useState(() => {
    const formation = formations.find((f) => f.id === formationInitiale);
    return formation ? calculerFin(aujourdhui(), formation.dureeMois) : "";
  });
  const [finModifiee, setFinModifiee] = useState(false);
  const [horaires, setHoraires] = useState("");
  const [capacite, setCapacite] = useState("");
  const [formateurId, setFormateurId] = useState("");

  const erreurs = etat.erreurs;

  function recalculerFin(idFormation: string, debut: string) {
    if (finModifiee) {
      return;
    }
    const formation = formations.find((f) => f.id === idFormation);
    setDateFin(formation ? calculerFin(debut, formation.dureeMois) : "");
  }

  return (
    <form action={envoyer} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Formation
        </h2>

        <Field id="formationId" label="Formation" required error={erreurs.formationId}>
          <select
            id="formationId"
            name="formationId"
            required
            value={formationId}
            onChange={(e) => {
              setFormationId(e.target.value);
              recalculerFin(e.target.value, dateDebut);
            }}
            aria-invalid={!!erreurs.formationId || undefined}
            aria-describedby={idDescription("formationId", erreurs.formationId)}
            className={classeChamp(erreurs.formationId)}
          >
            <option value="" disabled>
              Choisir une formation…
            </option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.intitule} ({f.dureeMois} mois)
              </option>
            ))}
          </select>
        </Field>

        <Field id="nom" label="Nom de la session" required error={erreurs.nom}>
          <input
            id="nom"
            name="nom"
            required
            maxLength={80}
            placeholder="Ex. Promo octobre 2026 · soir"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            aria-invalid={!!erreurs.nom || undefined}
            aria-describedby={idDescription("nom", erreurs.nom)}
            className={classeChamp(erreurs.nom)}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Calendrier
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="dateDebut" label="Date de début" required error={erreurs.dateDebut}>
            <input
              id="dateDebut"
              name="dateDebut"
              type="date"
              required
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                recalculerFin(formationId, e.target.value);
              }}
              aria-invalid={!!erreurs.dateDebut || undefined}
              aria-describedby={idDescription("dateDebut", erreurs.dateDebut)}
              className={classeChamp(erreurs.dateDebut)}
            />
          </Field>

          <Field id="dateFin" label="Date de fin" required hint={AIDE_FIN} error={erreurs.dateFin}>
            <input
              id="dateFin"
              name="dateFin"
              type="date"
              required
              min={dateDebut}
              value={dateFin}
              onChange={(e) => {
                setFinModifiee(true);
                setDateFin(e.target.value);
              }}
              aria-invalid={!!erreurs.dateFin || undefined}
              aria-describedby={idDescription("dateFin", erreurs.dateFin, AIDE_FIN)}
              className={classeChamp(erreurs.dateFin)}
            />
          </Field>
        </div>

        <Field id="horaires" label="Horaires" hint={AIDE_HORAIRES} error={erreurs.horaires}>
          <input
            id="horaires"
            name="horaires"
            maxLength={80}
            value={horaires}
            onChange={(e) => setHoraires(e.target.value)}
            aria-invalid={!!erreurs.horaires || undefined}
            aria-describedby={idDescription("horaires", erreurs.horaires, AIDE_HORAIRES)}
            className={classeChamp(erreurs.horaires)}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Organisation
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="formateurId" label="Formateur" error={erreurs.formateurId}>
            <select
              id="formateurId"
              name="formateurId"
              value={formateurId}
              onChange={(e) => setFormateurId(e.target.value)}
              aria-invalid={!!erreurs.formateurId || undefined}
              aria-describedby={idDescription("formateurId", erreurs.formateurId)}
              className={classeChamp(erreurs.formateurId)}
            >
              <option value="">À définir plus tard</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </Field>

          <Field id="capacite" label="Nombre de places" hint={AIDE_CAPACITE} error={erreurs.capacite}>
            <input
              id="capacite"
              name="capacite"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              aria-invalid={!!erreurs.capacite || undefined}
              aria-describedby={idDescription("capacite", erreurs.capacite, AIDE_CAPACITE)}
              className={classeChamp(erreurs.capacite)}
            />
          </Field>
        </div>
      </section>

      {etat.erreurGenerale && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/courses"
          className="flex h-12 items-center justify-center rounded-md border border-border px-5 font-medium text-ink hover:bg-surface-100"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={enCours}
          className="h-12 cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Ouvrir la session"}
        </button>
      </div>
    </form>
  );
}
