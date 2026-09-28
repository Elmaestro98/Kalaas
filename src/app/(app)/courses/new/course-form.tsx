"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { creerFormation, type EtatFormation } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatFcfa } from "@/lib/format";
import { grouperMontants, repartirMontant } from "@/lib/echeancier";

const etatInitial: EtatFormation = { erreurs: {}, erreurGenerale: null };

const AIDE_DUREE = "En mois";
const AIDE_MENSUALITES = "Par défaut, une par mois de formation";
const AIDE_FRAIS = "Payés une seule fois, à l'inscription";
const AIDE_PRIX = "Hors frais d'inscription, réparti en mensualités";

export default function CourseForm() {
  const [etat, envoyer, enCours] = useActionState(creerFormation, etatInitial);

  const [intitule, setIntitule] = useState("");
  const [duree, setDuree] = useState(6);
  const [nbMensualites, setNbMensualites] = useState(6);
  const [mensualitesModifiees, setMensualitesModifiees] = useState(false);
  const [frais, setFrais] = useState(0);
  const [prix, setPrix] = useState(0);

  const erreurs = etat.erreurs;
  const groupes = grouperMontants(repartirMontant(prix, nbMensualites));
  const total = frais + prix;

  function changerDuree(valeur: number) {
    setDuree(valeur);
    if (!mensualitesModifiees) {
      setNbMensualites(valeur);
    }
  }

  function changerMensualites(valeur: number) {
    setMensualitesModifiees(true);
    setNbMensualites(valeur);
  }

  return (
    <form action={envoyer} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Informations
        </h2>

        <Field id="intitule" label="Intitulé de la formation" required error={erreurs.intitule}>
          <input
            id="intitule"
            name="intitule"
            required
            maxLength={120}
            autoFocus
            placeholder="Ex. Développement web & mobile"
            value={intitule}
            onChange={(e) => setIntitule(e.target.value)}
            aria-invalid={!!erreurs.intitule || undefined}
            aria-describedby={idDescription("intitule", erreurs.intitule)}
            className={classeChamp(erreurs.intitule)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="dureeMois" label="Durée" required hint={AIDE_DUREE} error={erreurs.dureeMois}>
            <input
              id="dureeMois"
              name="dureeMois"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              required
              value={duree}
              onChange={(e) => changerDuree(Number(e.target.value))}
              aria-invalid={!!erreurs.dureeMois || undefined}
              aria-describedby={idDescription("dureeMois", erreurs.dureeMois, AIDE_DUREE)}
              className={classeChamp(erreurs.dureeMois)}
            />
          </Field>

          <Field
            id="nbMensualites"
            label="Nombre de mensualités"
            required
            hint={AIDE_MENSUALITES}
            error={erreurs.nbMensualites}
          >
            <input
              id="nbMensualites"
              name="nbMensualites"
              type="number"
              inputMode="numeric"
              min={1}
              max={36}
              required
              value={nbMensualites}
              onChange={(e) => changerMensualites(Number(e.target.value))}
              aria-invalid={!!erreurs.nbMensualites || undefined}
              aria-describedby={idDescription("nbMensualites", erreurs.nbMensualites, AIDE_MENSUALITES)}
              className={classeChamp(erreurs.nbMensualites)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Tarification
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="fraisInscription"
            label="Frais d'inscription"
            hint={AIDE_FRAIS}
            error={erreurs.fraisInscription}
          >
            <MoneyInput
              id="fraisInscription"
              name="fraisInscription"
              value={frais}
              onChange={setFrais}
              invalid={!!erreurs.fraisInscription}
              describedBy={idDescription("fraisInscription", erreurs.fraisInscription, AIDE_FRAIS)}
              className={classeChamp(erreurs.fraisInscription)}
            />
          </Field>

          <Field id="prixTotal" label="Prix de la formation" required hint={AIDE_PRIX} error={erreurs.prixTotal}>
            <MoneyInput
              id="prixTotal"
              name="prixTotal"
              required
              value={prix}
              onChange={setPrix}
              invalid={!!erreurs.prixTotal}
              describedBy={idDescription("prixTotal", erreurs.prixTotal, AIDE_PRIX)}
              className={classeChamp(erreurs.prixTotal)}
            />
          </Field>
        </div>

        <div aria-live="polite" className="rounded-lg border border-gold-500/40 bg-gold-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">
            Échéancier par apprenant
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">À l&apos;inscription</dt>
              <dd className="font-medium tabular-nums">{formatFcfa(frais)}</dd>
            </div>
            {groupes.map((groupe) => (
              <div key={`${groupe.nombre}-${groupe.montant}`} className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  {groupe.nombre} mensualité{groupe.nombre > 1 ? "s" : ""} de
                </dt>
                <dd className="font-medium tabular-nums">{formatFcfa(groupe.montant)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 border-t border-gold-500/40 pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-bold tabular-nums">{formatFcfa(total)}</dd>
            </div>
          </dl>
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
          {enCours ? "Enregistrement…" : "Enregistrer la formation"}
        </button>
      </div>
    </form>
  );
}
