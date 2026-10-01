"use client";

import { useActionState } from "react";
import { creerEvaluation, type EtatEvaluation } from "./actions";
import { classeChamp } from "@/components/ui/field";
import { TYPES_EVALUATION } from "@/lib/notes";

const etatInitial: EtatEvaluation = { erreur: null, succes: 0 };

type EvaluationFormProps = {
  sessionId: string;
  matiereId: string;
  poidsRestant: number;
  suggestion: string;
};

export default function EvaluationForm({ sessionId, matiereId, poidsRestant, suggestion }: EvaluationFormProps) {
  const [etat, envoyer, enCours] = useActionState(creerEvaluation, etatInitial);

  return (
    <form
      key={etat.succes}
      action={envoyer}
      className="grid gap-3 rounded-md bg-surface-100 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_9rem_5.5rem_5.5rem_auto] lg:items-end"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="matiereId" value={matiereId} />
      <label className="space-y-1">
        <span className="text-xs font-medium">Intitulé</span>
        <input name="intitule" required maxLength={60} defaultValue={suggestion} className={`${classeChamp()} h-10`} />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Type</span>
        <select name="type" defaultValue="DEVOIR" className={`${classeChamp()} h-10`}>
          {TYPES_EVALUATION.map((t) => (
            <option key={t.valeur} value={t.valeur}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Date</span>
        <input name="date" type="date" className={`${classeChamp()} h-10`} />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Poids (%)</span>
        <input
          name="poids"
          type="number"
          required
          min={1}
          max={poidsRestant}
          defaultValue={Math.min(poidsRestant, 50) || ""}
          className={`${classeChamp()} h-10`}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Sur</span>
        <input name="bareme" type="number" required min={1} max={100} defaultValue={20} className={`${classeChamp()} h-10`} />
      </label>
      <button
        type="submit"
        disabled={enCours || poidsRestant <= 0}
        className="h-10 cursor-pointer rounded-md bg-action px-4 text-sm font-medium whitespace-nowrap text-on-action hover:bg-action-hover disabled:opacity-50"
      >
        {enCours ? "…" : "Créer"}
      </button>
      {etat.erreur && <p className="text-sm text-danger sm:col-span-2 lg:col-span-6">{etat.erreur}</p>}
      {poidsRestant <= 0 && (
        <p className="text-xs text-ink-muted sm:col-span-2 lg:col-span-6">Les poids atteignent déjà 100 %.</p>
      )}
    </form>
  );
}
