"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { ajouterCreneau, type EtatCreneau } from "./actions";
import { creerMatiereRapide } from "../courses/subject-actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import { JOURS, heureVersMinutes, type Jour } from "@/lib/emploi-du-temps";

type Option = { id: string; nom: string };
type MatiereProgramme = { id: string; intitule: string; enseignantHabituelId: string | null };

type SlotFormProps = {
  sessionId: string;
  formationId: string;
  enseignants: Option[];
  salles: Option[];
  matieres: MatiereProgramme[];
  affectations: { matiereId: string | null; enseignantId: string }[];
};

const etatInitial: EtatCreneau = { erreurs: {}, erreurGenerale: null, succes: 0 };

// « 10:00 » + 120 min → « 12:00 » (plafonné à 23:00)
function decaler(heure: string, minutes: number): string {
  const total = Math.min((heureVersMinutes(heure) ?? 480) + minutes, 23 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function SlotForm({
  sessionId,
  formationId,
  enseignants,
  salles,
  matieres,
  affectations,
}: SlotFormProps) {
  const [etat, envoyer, enCours] = useActionState(ajouterCreneau, etatInitial);

  const [jour, setJour] = useState<Jour>("LUNDI");
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("10:00");
  const [matiereId, setMatiereId] = useState("");
  const [enseignantId, setEnseignantId] = useState("");
  const [salleId, setSalleId] = useState("");

  // Ajout rapide d'une matière au programme, sans quitter l'emploi du temps
  const [programme, setProgramme] = useState(matieres);
  const [nouvelle, setNouvelle] = useState<string | null>(null);
  const [erreurNouvelle, setErreurNouvelle] = useState<string | null>(null);
  const [enAjout, demarrer] = useTransition();

  function creerNouvelle() {
    const intitule = (nouvelle ?? "").trim();
    demarrer(async () => {
      const r = await creerMatiereRapide({ formationId, intitule });
      if (r.erreur || !r.matiere) {
        setErreurNouvelle(r.erreur ?? "Création impossible.");
        return;
      }
      const creee = r.matiere;
      setProgramme((liste) =>
        liste.some((m) => m.id === creee.id) ? liste : [...liste, { ...creee, enseignantHabituelId: null }],
      );
      setMatiereId(creee.id);
      setNouvelle(null);
      setErreurNouvelle(null);
    });
  }

  // Après un ajout réussi : même jour, le cours suivant commence à la fin du précédent
  const [succesTraite, setSuccesTraite] = useState(0);
  if (etat.succes !== succesTraite) {
    setSuccesTraite(etat.succes);
    const duree = (heureVersMinutes(fin) ?? 600) - (heureVersMinutes(debut) ?? 480);
    setDebut(fin);
    setFin(decaler(fin, duree > 0 ? duree : 120));
    setMatiereId("");
    setEnseignantId("");
  }

  const erreurs = etat.erreurs;

  // Professeur proposé : celui affecté à la matière dans cette classe, sinon son professeur habituel
  function profPropose(id: string): string | null {
    return (
      affectations.find((a) => a.matiereId === id)?.enseignantId ??
      programme.find((m) => m.id === id)?.enseignantHabituelId ??
      null
    );
  }

  function changerMatiere(id: string) {
    setMatiereId(id);
    const prof = profPropose(id);
    if (prof) {
      setEnseignantId(prof);
    }
  }

  const idPropose = matiereId ? profPropose(matiereId) : null;
  const nomProfAffecte = idPropose ? enseignants.find((e) => e.id === idPropose)?.nom : undefined;

  return (
    <form action={envoyer} className="space-y-4">
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_minmax(0,8rem)_minmax(0,1fr)]">
        <Field id="jour" label="Jour" required error={erreurs.jour}>
          <select
            id="jour"
            name="jour"
            required
            value={jour}
            onChange={(e) => setJour(e.target.value as Jour)}
            className={classeChamp(erreurs.jour)}
          >
            {JOURS.map((j) => (
              <option key={j.valeur} value={j.valeur}>
                {j.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="heureDebut" label="Début" required error={erreurs.heureDebut}>
          <input
            id="heureDebut"
            name="heureDebut"
            type="time"
            required
            step={300}
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            aria-invalid={!!erreurs.heureDebut || undefined}
            aria-describedby={idDescription("heureDebut", erreurs.heureDebut)}
            className={classeChamp(erreurs.heureDebut)}
          />
        </Field>
        <Field id="heureFin" label="Fin" required error={erreurs.heureFin}>
          <input
            id="heureFin"
            name="heureFin"
            type="time"
            required
            step={300}
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            aria-invalid={!!erreurs.heureFin || undefined}
            aria-describedby={idDescription("heureFin", erreurs.heureFin)}
            className={classeChamp(erreurs.heureFin)}
          />
        </Field>

        <div className="sm:col-span-3 lg:col-span-1">
          <Field id="matiereId" label="Matière" required error={erreurs.matiereId}>
            <div className="flex gap-2">
              <select
                id="matiereId"
                name="matiereId"
                required
                value={matiereId}
                onChange={(e) => changerMatiere(e.target.value)}
                aria-invalid={!!erreurs.matiereId || undefined}
                aria-describedby={idDescription("matiereId", erreurs.matiereId)}
                className={classeChamp(erreurs.matiereId)}
              >
                <option value="" disabled>
                  {programme.length ? "Choisir une matière du programme…" : "Aucune matière : ajoutez-en une →"}
                </option>
                {programme.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.intitule}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNouvelle(nouvelle === null ? "" : null)}
                aria-label="Nouvelle matière"
                title="Nouvelle matière"
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-surface-200 hover:bg-surface-100"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            {nouvelle !== null && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  aria-label="Intitulé de la nouvelle matière"
                  placeholder="Nouvelle matière (ajoutée au programme)"
                  value={nouvelle}
                  maxLength={80}
                  onChange={(e) => setNouvelle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      creerNouvelle();
                    }
                  }}
                  className={`${classeChamp()} h-10`}
                />
                <button
                  type="button"
                  onClick={creerNouvelle}
                  disabled={enAjout || nouvelle.trim().length < 2}
                  className="h-10 shrink-0 cursor-pointer rounded-md bg-action px-3 text-sm font-medium text-on-action disabled:opacity-50"
                >
                  {enAjout ? "…" : "Ajouter"}
                </button>
              </div>
            )}
            {erreurNouvelle && <p className="mt-1 text-sm text-danger">{erreurNouvelle}</p>}
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <Field
          id="enseignantId"
          label="Enseignant"
          hint={nomProfAffecte ? `Affecté à cette matière : ${nomProfAffecte}` : undefined}
          error={erreurs.enseignantId}
        >
          <select
            id="enseignantId"
            name="enseignantId"
            value={enseignantId}
            onChange={(e) => setEnseignantId(e.target.value)}
            className={classeChamp(erreurs.enseignantId)}
          >
            <option value="">À définir</option>
            {enseignants.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </Field>
        <Field id="salleId" label="Salle" error={erreurs.salleId}>
          <select
            id="salleId"
            name="salleId"
            value={salleId}
            onChange={(e) => setSalleId(e.target.value)}
            className={classeChamp(erreurs.salleId)}
          >
            <option value="">À définir</option>
            {salles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          disabled={enCours}
          className="h-11 w-full cursor-pointer rounded-md bg-action px-5 font-medium whitespace-nowrap text-on-action hover:bg-action-hover disabled:opacity-60 sm:col-span-2 lg:col-span-1 lg:w-auto"
        >
          {enCours ? "Ajout…" : "Ajouter le cours"}
        </button>
      </div>

      {etat.erreurGenerale && (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          {etat.erreurGenerale}
        </p>
      )}
      {etat.succes > 0 && !etat.erreurGenerale && (
        <p className="text-sm text-success">Cours ajouté. Vous pouvez saisir le suivant.</p>
      )}
    </form>
  );
}
