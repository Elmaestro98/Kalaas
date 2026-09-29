"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { creerInscription, type EtatInscription } from "../actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatDate, formatFcfa } from "@/lib/format";
import {
  calculerRemise,
  dateDuJour,
  genererEcheances,
  type TypeRemiseSaisie,
} from "@/lib/echeancier";

export type OptionSession = {
  id: string;
  nom: string;
  formation: string;
  annee: string | null;
  dateDebut: string;
  horaires: string | null;
  capacite: number | null;
  inscrits: number;
  fraisInscription: number;
  prixTotal: number;
  nbMensualites: number;
};

export type ApprenantExistant = {
  id: string;
  nom: string;
  matricule: string | null;
  telephone: string;
  parcours: string | null;
};

type TypeInscription = "NOUVELLE" | "REINSCRIPTION" | "REDOUBLEMENT";

type EnrollmentFormProps = {
  sessions: OptionSession[];
  sessionInitiale?: string;
  apprenant?: ApprenantExistant;
  typeInitial?: TypeInscription;
};

const etatInitial: EtatInscription = { erreurs: {}, erreurGenerale: null };

const AIDE_TELEPHONE = "Reçus et rappels envoyés sur ce numéro WhatsApp";
const AIDE_PIECE = "Facultatif · CNI ou passeport";
const AIDE_TUTEUR = "Facultatif · parent ou garant";

const TYPES: { valeur: TypeInscription; label: string; detail: string }[] = [
  { valeur: "REINSCRIPTION", label: "Réinscription", detail: "Passage au niveau suivant" },
  { valeur: "REDOUBLEMENT", label: "Redoublement", detail: "Même niveau, nouvelle année" },
  { valeur: "NOUVELLE", label: "Autre formation", detail: "En plus du parcours actuel" },
];

function Titre({ numero, children }: { numero: number; children: string }) {
  return (
    <h2 className="flex items-center gap-3 font-semibold">
      <span className="flex size-7 items-center justify-center rounded-full bg-navy-900 text-sm text-white">
        {numero}
      </span>
      {children}
    </h2>
  );
}

// Regroupe les sessions par année académique dans la liste déroulante
function grouperParAnnee(sessions: OptionSession[]) {
  const groupes = new Map<string, OptionSession[]>();
  for (const s of sessions) {
    const cle = s.annee ? `Année ${s.annee}` : "Formations courtes";
    groupes.set(cle, [...(groupes.get(cle) ?? []), s]);
  }
  return [...groupes.entries()];
}

export default function EnrollmentForm({
  sessions,
  sessionInitiale,
  apprenant,
  typeInitial,
}: EnrollmentFormProps) {
  const [etat, envoyer, enCours] = useActionState(creerInscription, etatInitial);

  const [type, setType] = useState<TypeInscription>(typeInitial ?? "REINSCRIPTION");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [sexe, setSexe] = useState("");
  const [diplomeAcces, setDiplomeAcces] = useState("");
  const [pieceIdentite, setPieceIdentite] = useState("");
  const [tuteurNom, setTuteurNom] = useState("");
  const [tuteurTelephone, setTuteurTelephone] = useState("");
  const [sessionId, setSessionId] = useState(sessionInitiale ?? "");
  const [avecRemise, setAvecRemise] = useState(false);
  const [remiseType, setRemiseType] = useState<TypeRemiseSaisie>("MONTANT");
  const [remiseValeur, setRemiseValeur] = useState(0);
  const [motifRemise, setMotifRemise] = useState("");

  const erreurs = etat.erreurs;
  const session = sessions.find((s) => s.id === sessionId);

  const remise = session && avecRemise ? calculerRemise(session.prixTotal, remiseType, remiseValeur) : 0;
  const echeances = session
    ? genererEcheances({
        fraisInscription: session.fraisInscription,
        prixTotal: session.prixTotal,
        nbMensualites: session.nbMensualites,
        remise,
        dateInscription: dateDuJour(),
        debutSession: new Date(session.dateDebut),
      })
    : [];
  const total = echeances.reduce((somme, e) => somme + e.montantDu, 0);

  function champTexte(
    id: "prenom" | "nom" | "email" | "lieuNaissance" | "diplomeAcces" | "pieceIdentite" | "tuteurNom",
    label: string,
    valeur: string,
    changer: (v: string) => void,
    options: { requis?: boolean; aide?: string; placeholder?: string; type?: string; max?: number } = {},
  ) {
    return (
      <Field id={id} label={label} required={options.requis} hint={options.aide} error={erreurs[id]}>
        <input
          id={id}
          name={id}
          type={options.type ?? "text"}
          required={options.requis}
          maxLength={options.max ?? 80}
          autoComplete="off"
          placeholder={options.placeholder}
          value={valeur}
          onChange={(e) => changer(e.target.value)}
          aria-invalid={!!erreurs[id] || undefined}
          aria-describedby={idDescription(id, erreurs[id], options.aide)}
          className={classeChamp(erreurs[id])}
        />
      </Field>
    );
  }

  return (
    <form action={envoyer} className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-6">
        {/* 1. Apprenant */}
        <section className="space-y-5 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
          <Titre numero={1}>{apprenant ? "Apprenant et type d'inscription" : "Apprenant"}</Titre>

          {apprenant ? (
            <>
              <input type="hidden" name="apprenantId" value={apprenant.id} />
              <div className="flex items-center gap-3 rounded-md bg-surface-100 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{apprenant.nom}</p>
                  <p className="text-sm text-ink-muted">
                    {apprenant.matricule ?? "Matricule attribué à l'enregistrement"} · {apprenant.telephone}
                  </p>
                  {apprenant.parcours && (
                    <p className="mt-1 text-xs text-ink-muted">Dernière inscription : {apprenant.parcours}</p>
                  )}
                </div>
                <Link href="/enrollments/new?mode=reinscription" className="text-sm font-semibold">
                  Changer
                </Link>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Type d&apos;inscription</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => (
                    <label
                      key={t.valeur}
                      className={`flex cursor-pointer flex-col rounded-md border p-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold-100 ${
                        type === t.valeur
                          ? "border-navy-900 bg-navy-900 text-white"
                          : "border-border bg-surface-200 hover:bg-surface-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t.valeur}
                        checked={type === t.valeur}
                        onChange={() => setType(t.valeur)}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">{t.label}</span>
                      <span className={`text-xs ${type === t.valeur ? "text-white/70" : "text-ink-muted"}`}>
                        {t.detail}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {champTexte("prenom", "Prénom", prenom, setPrenom, { requis: true, max: 60 })}
                {champTexte("nom", "Nom", nom, setNom, { requis: true, max: 60 })}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="telephone" label="WhatsApp" required hint={AIDE_TELEPHONE} error={erreurs.telephone}>
                  <div className="flex gap-2">
                    <span className="flex items-center rounded-sm border border-border bg-surface-100 px-3 text-sm font-medium">
                      +221
                    </span>
                    <input
                      id="telephone"
                      name="telephone"
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="77 123 45 67"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      aria-invalid={!!erreurs.telephone || undefined}
                      aria-describedby={idDescription("telephone", erreurs.telephone, AIDE_TELEPHONE)}
                      className={classeChamp(erreurs.telephone)}
                    />
                  </div>
                </Field>
                {champTexte("pieceIdentite", "Pièce d'identité", pieceIdentite, setPieceIdentite, {
                  aide: AIDE_PIECE,
                  max: 40,
                })}
              </div>

              <details className="group rounded-md border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                  Informations complémentaires
                  <span className="text-xs font-normal text-ink-muted">
                    Recommandé pour le LMD · <span className="group-open:hidden">afficher</span>
                    <span className="hidden group-open:inline">masquer</span>
                  </span>
                </summary>
                <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-2">
                  {champTexte("email", "E-mail", email, setEmail, { type: "email", max: 120 })}
                  <Field id="dateNaissance" label="Date de naissance" error={erreurs.dateNaissance}>
                    <input
                      id="dateNaissance"
                      name="dateNaissance"
                      type="date"
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      className={classeChamp(erreurs.dateNaissance)}
                    />
                  </Field>
                  {champTexte("lieuNaissance", "Lieu de naissance", lieuNaissance, setLieuNaissance)}
                  <Field id="sexe" label="Sexe" error={erreurs.sexe}>
                    <select
                      id="sexe"
                      name="sexe"
                      value={sexe}
                      onChange={(e) => setSexe(e.target.value)}
                      className={classeChamp(erreurs.sexe)}
                    >
                      <option value="">Non renseigné</option>
                      <option value="F">Féminin</option>
                      <option value="M">Masculin</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    {champTexte("diplomeAcces", "Diplôme d'accès", diplomeAcces, setDiplomeAcces, {
                      placeholder: "Ex. Bac S2 · 2025",
                    })}
                  </div>
                </div>
              </details>

              <div className="grid gap-5 rounded-md bg-surface-100 p-4 sm:grid-cols-2">
                {champTexte("tuteurNom", "Tuteur ou garant", tuteurNom, setTuteurNom, {
                  aide: AIDE_TUTEUR,
                  placeholder: "Ex. Amadou Sow (père)",
                })}
                <Field id="tuteurTelephone" label="Téléphone du tuteur" error={erreurs.tuteurTelephone}>
                  <input
                    id="tuteurTelephone"
                    name="tuteurTelephone"
                    type="tel"
                    inputMode="tel"
                    placeholder="78 320 15 44"
                    value={tuteurTelephone}
                    onChange={(e) => setTuteurTelephone(e.target.value)}
                    aria-invalid={!!erreurs.tuteurTelephone || undefined}
                    aria-describedby={idDescription("tuteurTelephone", erreurs.tuteurTelephone)}
                    className={classeChamp(erreurs.tuteurTelephone)}
                  />
                </Field>
              </div>
            </>
          )}
        </section>

        {/* 2. Session */}
        <section className="space-y-5 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
          <Titre numero={2}>Formation et session</Titre>

          <Field id="sessionId" label="Session ou promotion" required error={erreurs.sessionId}>
            <select
              id="sessionId"
              name="sessionId"
              required
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              aria-invalid={!!erreurs.sessionId || undefined}
              aria-describedby={idDescription("sessionId", erreurs.sessionId)}
              className={classeChamp(erreurs.sessionId)}
            >
              <option value="" disabled>
                Choisir une session…
              </option>
              {grouperParAnnee(sessions).map(([groupe, liste]) => (
                <optgroup key={groupe} label={groupe}>
                  {liste.map((s) => {
                    const complet = s.capacite !== null && s.inscrits >= s.capacite;
                    return (
                      <option key={s.id} value={s.id} disabled={complet}>
                        {s.formation} · {s.nom}
                        {complet ? " (complet)" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </Field>

          {session && (
            <dl className="grid gap-3 rounded-md bg-surface-100 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-muted">Début des cours</dt>
                <dd className="font-medium">{formatDate(new Date(session.dateDebut))}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Horaires</dt>
                <dd className="font-medium">{session.horaires ?? "À définir"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Places</dt>
                <dd className="font-medium">
                  {session.capacite
                    ? `${session.inscrits}/${session.capacite} · ${session.capacite - session.inscrits} restantes`
                    : `${session.inscrits} inscrit${session.inscrits > 1 ? "s" : ""}`}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* 3. Remise */}
        <section className="space-y-5 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Titre numero={3}>Remise ou bourse</Titre>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="avecRemise"
                checked={avecRemise}
                onChange={(e) => setAvecRemise(e.target.checked)}
                className="size-4 accent-navy-900"
              />
              Appliquer une remise
            </label>
          </div>

          {avecRemise && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="remiseType" label="Type" required error={erreurs.remiseType}>
                  <select
                    id="remiseType"
                    name="remiseType"
                    value={remiseType}
                    onChange={(e) => {
                      setRemiseType(e.target.value as TypeRemiseSaisie);
                      setRemiseValeur(0);
                    }}
                    className={classeChamp(erreurs.remiseType)}
                  >
                    <option value="MONTANT">Montant fixe (FCFA)</option>
                    <option value="POURCENTAGE">Pourcentage (%)</option>
                  </select>
                </Field>

                <Field id="remiseValeur" label="Valeur" required error={erreurs.remiseValeur}>
                  {remiseType === "MONTANT" ? (
                    <MoneyInput
                      id="remiseValeur"
                      name="remiseValeur"
                      value={remiseValeur}
                      onChange={setRemiseValeur}
                      invalid={!!erreurs.remiseValeur}
                      describedBy={idDescription("remiseValeur", erreurs.remiseValeur)}
                      className={classeChamp(erreurs.remiseValeur)}
                    />
                  ) : (
                    <div className="relative">
                      <input
                        id="remiseValeur"
                        name="remiseValeur"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={remiseValeur || ""}
                        onChange={(e) => setRemiseValeur(Number(e.target.value))}
                        aria-invalid={!!erreurs.remiseValeur || undefined}
                        aria-describedby={idDescription("remiseValeur", erreurs.remiseValeur)}
                        className={`${classeChamp(erreurs.remiseValeur)} pr-10 text-right`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
                        %
                      </span>
                    </div>
                  )}
                </Field>
              </div>

              <Field id="motifRemise" label="Motif" required error={erreurs.motifRemise}>
                <input
                  id="motifRemise"
                  name="motifRemise"
                  maxLength={120}
                  placeholder="Ex. Bourse d'excellence, fratrie, partenariat…"
                  value={motifRemise}
                  onChange={(e) => setMotifRemise(e.target.value)}
                  aria-invalid={!!erreurs.motifRemise || undefined}
                  aria-describedby={idDescription("motifRemise", erreurs.motifRemise)}
                  className={classeChamp(erreurs.motifRemise)}
                />
              </Field>

              <p className="text-xs text-ink-muted">
                La remise est déduite des mensualités (jamais des frais d&apos;inscription). Elle est
                tracée à votre nom dans le journal.
              </p>
            </>
          )}
        </section>
      </div>

      {/* Récapitulatif */}
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-lg border border-border bg-surface-200 p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Échéancier</p>

          {!session ? (
            <p className="mt-3 text-sm text-ink-muted">
              Choisissez une session pour voir l&apos;échéancier.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-border text-sm" aria-live="polite">
                {echeances.map((e) => (
                  <li key={e.ordre} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      <span className="block">{e.libelle}</span>
                      <span className="text-xs text-ink-muted">{formatDate(e.dateLimite)}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatFcfa(e.montantDu)}</span>
                  </li>
                ))}
              </ul>
              {remise > 0 && (
                <p className="mt-2 flex justify-between text-sm text-success">
                  <span>Remise</span>
                  <span className="tabular-nums">− {formatFcfa(remise)}</span>
                </p>
              )}
              <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="font-semibold">Total dû</span>
                <span className="text-lg font-bold tabular-nums">{formatFcfa(total)}</span>
              </p>
            </>
          )}
        </div>

        {etat.erreurGenerale && (
          <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
            {etat.erreurGenerale}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="h-12 w-full cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
        >
          {enCours
            ? "Enregistrement…"
            : apprenant
              ? type === "NOUVELLE"
                ? "Inscrire à cette formation"
                : "Enregistrer la réinscription"
              : "Inscrire l'apprenant"}
        </button>
        <Link
          href="/students"
          className="flex h-11 w-full items-center justify-center rounded-md border border-border font-medium text-ink hover:bg-surface-100"
        >
          Annuler
        </Link>
      </aside>
    </form>
  );
}
