"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { creerSession, type EtatSession } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import { estLmd, type Cycle } from "@/lib/lmd";

type OptionFormation = { id: string; intitule: string; dureeMois: number; cycle: Cycle };
type OptionFormateur = { id: string; nom: string };
type OptionAnnee = { id: string; libelle: string; dateDebut: string; dateFin: string; enCours: boolean };

type SessionFormProps = {
  formations: OptionFormation[];
  formateurs: OptionFormateur[];
  annees: OptionAnnee[];
  formationInitiale?: string;
};

const etatInitial: EtatSession = { erreurs: {}, erreurGenerale: null };

const AIDE_FIN = "Calculée d'après la durée de la formation";
const AIDE_FIN_LMD = "Reprise de l'année académique";
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

type Calendrier = { anneeId: string; dateDebut: string; dateFin: string; nom: string };

// Dates et nom proposés selon la formation (courte ou LMD) et l'année académique
function proposer(
  formation: OptionFormation | undefined,
  annee: OptionAnnee | undefined,
  debutActuel: string,
): Calendrier {
  if (formation && estLmd(formation.cycle) && annee) {
    return {
      anneeId: annee.id,
      dateDebut: annee.dateDebut.slice(0, 10),
      dateFin: annee.dateFin.slice(0, 10),
      nom: `Promotion ${annee.libelle}`,
    };
  }
  return {
    anneeId: "",
    dateDebut: debutActuel,
    dateFin: formation ? calculerFin(debutActuel, formation.dureeMois) : "",
    nom: "",
  };
}

export default function SessionForm({ formations, formateurs, annees, formationInitiale }: SessionFormProps) {
  const [etat, envoyer, enCours] = useActionState(creerSession, etatInitial);

  const anneeParDefaut = annees.find((a) => a.enCours) ?? annees[0];
  const [initial] = useState(() =>
    proposer(formations.find((f) => f.id === formationInitiale), anneeParDefaut, aujourdhui()),
  );

  const [formationId, setFormationId] = useState(formationInitiale ?? "");
  const [anneeId, setAnneeId] = useState(initial.anneeId);
  const [nom, setNom] = useState(initial.nom);
  const [nomModifie, setNomModifie] = useState(false);
  const [dateDebut, setDateDebut] = useState(initial.dateDebut);
  const [dateFin, setDateFin] = useState(initial.dateFin);
  const [finModifiee, setFinModifiee] = useState(false);
  const [horaires, setHoraires] = useState("");
  const [capacite, setCapacite] = useState("");
  const [formateurId, setFormateurId] = useState("");

  const erreurs = etat.erreurs;
  const formation = formations.find((f) => f.id === formationId);
  const lmd = formation ? estLmd(formation.cycle) : false;
  const sansAnnee = lmd && annees.length === 0;

  function appliquer(idFormation: string, idAnnee: string, debut: string) {
    const f = formations.find((x) => x.id === idFormation);
    const choixAnnee =
      f && estLmd(f.cycle) ? (annees.find((a) => a.id === idAnnee) ?? anneeParDefaut) : undefined;
    const p = proposer(f, choixAnnee, debut);

    setAnneeId(p.anneeId);
    if (!finModifiee) {
      setDateDebut(p.dateDebut);
      setDateFin(p.dateFin);
    }
    if (!nomModifie) {
      setNom(p.nom);
    }
  }

  return (
    <form action={envoyer} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Formation</h2>

        <Field id="formationId" label="Formation" required error={erreurs.formationId}>
          <select
            id="formationId"
            name="formationId"
            required
            value={formationId}
            onChange={(e) => {
              setFormationId(e.target.value);
              appliquer(e.target.value, anneeId, dateDebut);
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
                {f.intitule}
                {!estLmd(f.cycle) && ` (${f.dureeMois} mois)`}
              </option>
            ))}
          </select>
        </Field>

        {lmd &&
          (sansAnnee ? (
            <p className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
              Créez d&apos;abord une année académique (ex. 2026-2027) dans{" "}
              <Link href="/settings" className="font-semibold">
                Paramètres
              </Link>
              .
            </p>
          ) : (
            <Field id="anneeAcademiqueId" label="Année académique" required error={erreurs.anneeAcademiqueId}>
              <select
                id="anneeAcademiqueId"
                name="anneeAcademiqueId"
                required
                value={anneeId}
                onChange={(e) => appliquer(formationId, e.target.value, dateDebut)}
                aria-invalid={!!erreurs.anneeAcademiqueId || undefined}
                className={classeChamp(erreurs.anneeAcademiqueId)}
              >
                {annees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.libelle}
                    {a.enCours ? " (en cours)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        {!lmd && <input type="hidden" name="anneeAcademiqueId" value="" />}

        <Field id="nom" label={lmd ? "Nom de la promotion" : "Nom de la session"} required error={erreurs.nom}>
          <input
            id="nom"
            name="nom"
            required
            maxLength={80}
            placeholder={lmd ? "Ex. Promotion 2026-2027" : "Ex. Promo octobre 2026 · soir"}
            value={nom}
            onChange={(e) => {
              setNomModifie(true);
              setNom(e.target.value);
            }}
            aria-invalid={!!erreurs.nom || undefined}
            aria-describedby={idDescription("nom", erreurs.nom)}
            className={classeChamp(erreurs.nom)}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Calendrier</h2>

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
                if (!lmd && !finModifiee && formation) {
                  setDateFin(calculerFin(e.target.value, formation.dureeMois));
                }
              }}
              aria-invalid={!!erreurs.dateDebut || undefined}
              aria-describedby={idDescription("dateDebut", erreurs.dateDebut)}
              className={classeChamp(erreurs.dateDebut)}
            />
          </Field>

          <Field
            id="dateFin"
            label="Date de fin"
            required
            hint={lmd ? AIDE_FIN_LMD : AIDE_FIN}
            error={erreurs.dateFin}
          >
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
              aria-describedby={idDescription("dateFin", erreurs.dateFin, lmd ? AIDE_FIN_LMD : AIDE_FIN)}
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Organisation</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="formateurId" label={lmd ? "Responsable ou enseignant" : "Formateur"} error={erreurs.formateurId}>
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
          disabled={enCours || sansAnnee}
          className="h-12 cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Ouvrir la session"}
        </button>
      </div>
    </form>
  );
}
