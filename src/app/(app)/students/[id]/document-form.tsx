"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, FileDown } from "lucide-react";
import { classeChamp } from "@/components/ui/field";
import { TYPES_DOCUMENT, refusDocument, type StatutInscriptionSaisie, type TypeDocumentSaisie } from "@/lib/documents";
import { delivrerDocument, type EtatDocument } from "./document-actions";

type DocumentFormProps = {
  inscriptions: { id: string; label: string; statut: StatutInscriptionSaisie }[];
};

const etatInitial: EtatDocument = { erreur: null, document: null };

export default function DocumentForm({ inscriptions }: DocumentFormProps) {
  const [etat, envoyer, enCours] = useActionState(delivrerDocument, etatInitial);
  const [inscriptionId, setInscriptionId] = useState(inscriptions[0]?.id ?? "");
  const [type, setType] = useState<TypeDocumentSaisie>("ATTESTATION_INSCRIPTION");

  const statut = inscriptions.find((i) => i.id === inscriptionId)?.statut ?? "ACTIVE";
  const refus = refusDocument(type, statut);

  return (
    <form action={envoyer} className="space-y-3">
      {inscriptions.length > 1 ? (
        <select
          name="inscriptionId"
          aria-label="Inscription"
          value={inscriptionId}
          onChange={(e) => setInscriptionId(e.target.value)}
          className={classeChamp()}
        >
          {inscriptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="inscriptionId" value={inscriptionId} />
      )}

      <fieldset className="space-y-2">
        <legend className="sr-only">Type de document</legend>
        {(Object.keys(TYPES_DOCUMENT) as TypeDocumentSaisie[]).map((t) => (
          <label
            key={t}
            className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
              type === t ? "border-gold-500 bg-gold-100/50" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="mt-1 accent-gold-500"
            />
            <span>
              <span className="block text-sm font-medium">{TYPES_DOCUMENT[t].label}</span>
              <span className="block text-xs text-ink-muted">{TYPES_DOCUMENT[t].aide}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <input
        name="motif"
        maxLength={120}
        placeholder="Motif (facultatif) : demande de bourse…"
        aria-label="Motif"
        className={classeChamp()}
      />

      {refus && <p className="rounded-sm bg-warning-soft px-3 py-2 text-sm text-warning">{refus}</p>}
      {etat.erreur && (
        <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
          {etat.erreur}
        </p>
      )}
      {etat.document && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span className="flex-1">
            Document <b>N° {etat.document.numero}</b> délivré.
          </span>
          <a href={`/documents/${etat.document.id}`} download className="flex items-center gap-1 font-semibold underline">
            <FileDown size={14} aria-hidden="true" />
            Télécharger
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={enCours || Boolean(refus)}
        className="h-11 w-full cursor-pointer rounded-md bg-action px-4 font-medium text-on-action hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enCours ? "Délivrance…" : "Délivrer le document"}
      </button>
    </form>
  );
}
