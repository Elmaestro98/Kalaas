"use client";

import { startTransition, useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { classeChamp } from "@/components/ui/field";
import { formatNote } from "@/lib/notes";
import {
  DECISIONS_FIN_ANNEE,
  DISTINCTIONS,
  LONGUEUR_APPRECIATION,
  NIVEAU,
  NIVEAUX_ACQUISITION,
  appreciationSuggeree,
  formatRang,
  seuilReussite,
  type DecisionSaisie,
  type DistinctionSaisie,
  type NiveauSaisie,
} from "@/lib/bulletins";
import { enregistrerAppreciations, type EtatAppreciations } from "./actions";

export type LigneAppreciation = {
  inscriptionId: string;
  nom: string;
  moyenne: number | null;
  rang: string | null; // « 3e » (conseil de classe uniquement)
  texte: string;
  distinction: DistinctionSaisie | null; // enregistrée, sinon proposée
  moyenneAnnuelle: number | null; // dernière période uniquement
  decision: DecisionSaisie | null; // enregistrée, sinon proposée (dernière période)
  niveau: NiveauSaisie | null; // préscolaire : niveau d'acquisition de la compétence
  bilan: string | null; // préscolaire, conseil de classe : « 5 A · 2 EC · 1 NA »
};

type AppreciationGridProps = {
  sessionId: string;
  periode: number;
  cible: string; // « conseil » ou identifiant de matière
  lignes: LigneAppreciation[];
  finAnnee: boolean; // conseil de la dernière période : décision de passage ou de redoublement
  sur: number; // échelle des moyennes (10 ou 20)
  competences: boolean; // préscolaire : niveaux d'acquisition au lieu des notes
};

const etatInitial: EtatAppreciations = { erreur: null, enregistre: 0 };

export default function AppreciationGrid({
  sessionId,
  periode,
  cible,
  lignes,
  finAnnee,
  sur,
  competences,
}: AppreciationGridProps) {
  const [etat, envoyer, enCours] = useActionState(enregistrerAppreciations, etatInitial);
  const conseil = cible === "conseil";
  const [textes, setTextes] = useState<Record<string, string>>(
    Object.fromEntries(lignes.map((l) => [l.inscriptionId, l.texte])),
  );
  const [niveaux, setNiveaux] = useState<Record<string, NiveauSaisie | "">>(
    Object.fromEntries(lignes.map((l) => [l.inscriptionId, l.niveau ?? ""])),
  );

  // Suggestion d'après le niveau d'acquisition (préscolaire) ou la moyenne
  const suggestion = (l: LigneAppreciation): string => {
    if (competences) {
      const niveau = niveaux[l.inscriptionId];
      return !conseil && niveau ? NIVEAU[niveau].suggestion : "";
    }
    return appreciationSuggeree(l.moyenne, sur);
  };
  const vides = lignes.filter((l) => !textes[l.inscriptionId] && suggestion(l)).length;
  const seuil = seuilReussite(sur);

  return (
    <form
      // Envoi manuel : la saisie reste affichée après l'enregistrement
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
      className="mt-4 space-y-4"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="periode" value={periode} />
      <input type="hidden" name="cible" value={cible} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {LONGUEUR_APPRECIATION} caractères maximum. Un champ vide n&apos;apparaît pas sur le bulletin.
        </p>
        {!(competences && conseil) && (
          <button
            type="button"
            disabled={vides === 0}
            onClick={() =>
              setTextes((avant) => ({
                ...avant,
                ...Object.fromEntries(
                  lignes
                    .filter((l) => !avant[l.inscriptionId] && suggestion(l))
                    .map((l) => [l.inscriptionId, suggestion(l)]),
                ),
              }))
            }
            className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-200 px-3 text-sm font-medium hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={16} aria-hidden="true" />
            Compléter avec des suggestions{vides > 0 && ` (${vides})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface-200">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-surface-100 text-left text-xs text-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Nom</th>
              {competences ? (
                <th scope="col" className="px-3 py-2 font-semibold">{conseil ? "Compétences" : "Niveau"}</th>
              ) : (
                <th scope="col" className="px-3 py-2 text-center font-semibold">
                  {conseil ? "Moy. générale" : "Moyenne"} /{sur}
                </th>
              )}
              {conseil && !competences && <th scope="col" className="px-3 py-2 text-center font-semibold">Rang</th>}
              {conseil && !competences && <th scope="col" className="px-3 py-2 font-semibold">Distinction</th>}
              {finAnnee && !competences && (
                <th scope="col" className="px-3 py-2 text-center font-semibold">Moy. annuelle</th>
              )}
              {finAnnee && <th scope="col" className="px-3 py-2 font-semibold">Décision</th>}
              <th scope="col" className="w-1/2 px-3 py-2 font-semibold">{conseil ? "Appréciation générale" : "Appréciation"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((l) => (
              <tr key={l.inscriptionId}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{l.nom}</th>
                {competences ? (
                  conseil ? (
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted">{l.bilan ?? "Non évalué"}</td>
                  ) : (
                    <td className="px-3 py-2">
                      <select
                        name={`n_${l.inscriptionId}`}
                        value={niveaux[l.inscriptionId] ?? ""}
                        onChange={(e) =>
                          setNiveaux((avant) => ({ ...avant, [l.inscriptionId]: e.target.value as NiveauSaisie | "" }))
                        }
                        aria-label={`Niveau de ${l.nom}`}
                        className={`${classeChamp()} h-10`}
                      >
                        <option value="">Non évalué</option>
                        {NIVEAUX_ACQUISITION.map((n) => (
                          <option key={n.valeur} value={n.valeur}>
                            {n.court} · {n.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                ) : (
                  <td className={`px-3 py-2 text-center tabular-nums ${l.moyenne !== null && l.moyenne < seuil ? "text-danger" : ""}`}>
                    {formatNote(l.moyenne)}
                  </td>
                )}
                {conseil && !competences && (
                  <td className="px-3 py-2 text-center tabular-nums">{l.rang ?? formatRang(null)}</td>
                )}
                {conseil && !competences && (
                  <td className="px-3 py-2">
                    <select
                      name={`d_${l.inscriptionId}`}
                      defaultValue={l.distinction ?? ""}
                      aria-label={`Distinction de ${l.nom}`}
                      className={`${classeChamp()} h-10`}
                    >
                      <option value="">Aucune</option>
                      {DISTINCTIONS.map((d) => (
                        <option key={d.valeur} value={d.valeur}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {finAnnee && !competences && (
                  <td
                    className={`px-3 py-2 text-center font-semibold tabular-nums ${
                      l.moyenneAnnuelle !== null && l.moyenneAnnuelle < seuil ? "text-danger" : ""
                    }`}
                  >
                    {formatNote(l.moyenneAnnuelle)}
                  </td>
                )}
                {finAnnee && (
                  <td className="px-3 py-2">
                    <select
                      name={`f_${l.inscriptionId}`}
                      defaultValue={l.decision ?? ""}
                      aria-label={`Décision de fin d'année de ${l.nom}`}
                      className={`${classeChamp()} h-10`}
                    >
                      <option value="">À décider</option>
                      {DECISIONS_FIN_ANNEE.map((d) => (
                        <option key={d.valeur} value={d.valeur}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-2">
                  <input
                    name={`a_${l.inscriptionId}`}
                    value={textes[l.inscriptionId] ?? ""}
                    onChange={(e) => setTextes((avant) => ({ ...avant, [l.inscriptionId]: e.target.value }))}
                    maxLength={LONGUEUR_APPRECIATION}
                    aria-label={`Appréciation de ${l.nom}`}
                    placeholder={suggestion(l)}
                    className={`${classeChamp()} h-10`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="h-11 cursor-pointer rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {etat.erreur && <p role="alert" className="text-sm text-danger">{etat.erreur}</p>}
      </div>
    </form>
  );
}
