"use client";

import { useActionState, useState } from "react";
import { cloturerCaisse, type EtatCloture } from "./actions";
import Field, { classeChamp } from "@/components/ui/field";
import MoneyInput from "@/components/ui/money-input";
import { formatFcfa } from "@/lib/format";

const etatInitial: EtatCloture = { erreur: null };

export default function ClosingForm({ especesAttendues }: { especesAttendues: number }) {
  const [etat, envoyer, enCours] = useActionState(cloturerCaisse, etatInitial);
  const [compte, setCompte] = useState(0);
  const [saisi, setSaisi] = useState(false);
  const [commentaire, setCommentaire] = useState("");

  const ecart = compte - especesAttendues;

  return (
    <form action={envoyer} className="space-y-4">
      <Field id="montantCompte" label="Espèces comptées dans la caisse" required>
        <MoneyInput
          id="montantCompte"
          name="montantCompte"
          value={compte}
          onChange={(v) => {
            setCompte(v);
            setSaisi(true);
          }}
          className={`${classeChamp()} h-14 text-xl font-semibold`}
        />
      </Field>

      {saisi && (
        <p
          className={`rounded-md px-4 py-3 text-sm font-semibold ${
            ecart === 0
              ? "bg-success-soft text-success"
              : ecart > 0
                ? "bg-warning-soft text-warning"
                : "bg-danger-soft text-danger"
          }`}
        >
          {ecart === 0
            ? "Caisse juste : aucun écart."
            : ecart > 0
              ? `Excédent de ${formatFcfa(ecart)} (plus d'argent que prévu).`
              : `Manque de ${formatFcfa(-ecart)} (moins d'argent que prévu).`}
        </p>
      )}

      <Field
        id="commentaire"
        label="Commentaire"
        required={saisi && ecart !== 0}
        hint={saisi && ecart !== 0 ? "Obligatoire en cas d'écart" : "Facultatif"}
      >
        <textarea
          id="commentaire"
          name="commentaire"
          rows={2}
          maxLength={300}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex. 2 000 FCFA rendus en trop à un apprenant"
          className="w-full rounded-sm border border-border bg-surface-200 p-3 text-sm text-ink outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-100"
        />
      </Field>

      {etat.erreur && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || !saisi}
        className="h-12 w-full cursor-pointer rounded-md bg-action px-6 font-medium text-on-action hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enCours ? "Clôture…" : "Clôturer ma caisse"}
      </button>
      <p className="text-xs text-ink-muted">
        Une fois clôturée, vous ne pourrez plus encaisser d&apos;espèces aujourd&apos;hui.
      </p>
    </form>
  );
}
