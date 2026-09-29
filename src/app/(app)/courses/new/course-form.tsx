"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { creerFormation, type EtatFormation } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatFcfa } from "@/lib/format";
import { grouperMontants, repartirMontant } from "@/lib/echeancier";
import { CYCLES, codeNiveau, estLmd, intituleLmd, type Cycle } from "@/lib/lmd";

const etatInitial: EtatFormation = { erreurs: {}, erreurGenerale: null };

const AIDE_DUREE = "En mois";
const AIDE_MENSUALITES = "Par défaut, une par mois de formation";
const AIDE_FRAIS = "Payés une seule fois, à l'inscription";
const AIDE_PRIX = "Hors frais d'inscription, réparti en mensualités";
const AIDE_FILIERE = "Ex. Informatique de gestion, Finance-Comptabilité";

const CHOIX_CYCLES: { valeur: Cycle; label: string; detail: string }[] = [
  { valeur: "FORMATION_COURTE", label: "Formation courte", detail: "Quelques mois" },
  { valeur: "LICENCE", label: "Licence", detail: "L1 · L2 · L3" },
  { valeur: "MASTER", label: "Master", detail: "M1 · M2" },
  { valeur: "DOCTORAT", label: "Doctorat", detail: "D1 · D2 · D3" },
];

// Durée par défaut d'un niveau LMD : une année académique (octobre → juillet)
const DUREE_LMD = 10;
const DUREE_COURTE = 6;

export default function CourseForm({ filieres }: { filieres: string[] }) {
  const [etat, envoyer, enCours] = useActionState(creerFormation, etatInitial);

  const [cycle, setCycle] = useState<Cycle>("FORMATION_COURTE");
  const [intitule, setIntitule] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState(1);
  const [duree, setDuree] = useState(DUREE_COURTE);
  const [nbMensualites, setNbMensualites] = useState(DUREE_COURTE);
  const [mensualitesModifiees, setMensualitesModifiees] = useState(false);
  const [frais, setFrais] = useState(0);
  const [prix, setPrix] = useState(0);

  const erreurs = etat.erreurs;
  const lmd = estLmd(cycle);
  const groupes = grouperMontants(repartirMontant(prix, nbMensualites));
  const total = frais + prix;

  function changerCycle(nouveau: Cycle) {
    setCycle(nouveau);
    setNiveau(1);
    const dureeDefaut = estLmd(nouveau) ? DUREE_LMD : DUREE_COURTE;
    setDuree(dureeDefaut);
    if (!mensualitesModifiees) {
      setNbMensualites(dureeDefaut);
    }
  }

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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Type de formation</h2>

        <fieldset>
          <legend className="sr-only">Type de formation</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHOIX_CYCLES.map((c) => (
              <label
                key={c.valeur}
                className={`flex cursor-pointer flex-col rounded-md border p-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
                  cycle === c.valeur
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-border bg-surface-200 text-ink hover:bg-surface-100"
                }`}
              >
                <input
                  type="radio"
                  name="cycle"
                  value={c.valeur}
                  checked={cycle === c.valeur}
                  onChange={() => changerCycle(c.valeur)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">{c.label}</span>
                <span className={`text-xs ${cycle === c.valeur ? "text-white/70" : "text-ink-muted"}`}>
                  {c.detail}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Informations</h2>

        {lmd ? (
          <>
            <input type="hidden" name="intitule" value="" />
            <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
              <Field id="filiere" label="Filière" required hint={AIDE_FILIERE} error={erreurs.filiere}>
                <input
                  id="filiere"
                  name="filiere"
                  required
                  maxLength={80}
                  list="filieres-existantes"
                  autoComplete="off"
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value)}
                  aria-invalid={!!erreurs.filiere || undefined}
                  aria-describedby={idDescription("filiere", erreurs.filiere, AIDE_FILIERE)}
                  className={classeChamp(erreurs.filiere)}
                />
                <datalist id="filieres-existantes">
                  {filieres.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>
              <Field id="niveau" label="Niveau" required error={erreurs.niveau}>
                <select
                  id="niveau"
                  name="niveau"
                  value={niveau}
                  onChange={(e) => setNiveau(Number(e.target.value))}
                  aria-invalid={!!erreurs.niveau || undefined}
                  aria-describedby={idDescription("niveau", erreurs.niveau)}
                  className={classeChamp(erreurs.niveau)}
                >
                  {Array.from({ length: CYCLES[cycle].nbNiveaux }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {codeNiveau(cycle, n)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="rounded-md bg-surface-100 px-4 py-3 text-sm">
              <span className="text-ink-muted">Intitulé : </span>
              <b>{filiere.trim() ? intituleLmd(cycle, filiere, niveau) : "—"}</b>
              <span className="mt-1 block text-xs text-ink-muted">
                Créez une formation par niveau : chaque niveau a son propre tarif.
              </span>
            </p>
          </>
        ) : (
          <>
            <input type="hidden" name="filiere" value="" />
            <Field id="intitule" label="Intitulé de la formation" required error={erreurs.intitule}>
              <input
                id="intitule"
                name="intitule"
                required
                maxLength={120}
                placeholder="Ex. Développement web & mobile"
                value={intitule}
                onChange={(e) => setIntitule(e.target.value)}
                aria-invalid={!!erreurs.intitule || undefined}
                aria-describedby={idDescription("intitule", erreurs.intitule)}
                className={classeChamp(erreurs.intitule)}
              />
            </Field>
          </>
        )}

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
          Tarification{lmd && " annuelle"}
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="fraisInscription"
            label={lmd ? "Frais d'inscription annuels" : "Frais d'inscription"}
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

          <Field
            id="prixTotal"
            label={lmd ? "Scolarité annuelle" : "Prix de la formation"}
            required
            hint={AIDE_PRIX}
            error={erreurs.prixTotal}
          >
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
            Échéancier par {lmd ? "étudiant et par an" : "apprenant"}
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
