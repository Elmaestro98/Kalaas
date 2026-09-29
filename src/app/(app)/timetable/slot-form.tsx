"use client";

import { useActionState, useState } from "react";
import { ajouterCreneau, type EtatCreneau } from "./actions";
import Field, { classeChamp, idDescription } from "@/components/ui/field";
import { JOURS, heureVersMinutes, type Jour } from "@/lib/emploi-du-temps";

type Option = { id: string; nom: string };

type SlotFormProps = {
  sessionId: string;
  enseignants: Option[];
  salles: Option[];
  matieres: string[];
};

const etatInitial: EtatCreneau = { erreurs: {}, erreurGenerale: null, succes: 0 };

// « 10:00 » + 120 min → « 12:00 » (plafonné à 23:00)
function decaler(heure: string, minutes: number): string {
  const total = Math.min((heureVersMinutes(heure) ?? 480) + minutes, 23 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function SlotForm({ sessionId, enseignants, salles, matieres }: SlotFormProps) {
  const [etat, envoyer, enCours] = useActionState(ajouterCreneau, etatInitial);

  const [jour, setJour] = useState<Jour>("LUNDI");
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("10:00");
  const [matiere, setMatiere] = useState("");
  const [enseignantId, setEnseignantId] = useState("");
  const [salleId, setSalleId] = useState("");

  // Après un ajout réussi : même jour, le cours suivant commence à la fin du précédent
  const [succesTraite, setSuccesTraite] = useState(0);
  if (etat.succes !== succesTraite) {
    setSuccesTraite(etat.succes);
    const duree = (heureVersMinutes(fin) ?? 600) - (heureVersMinutes(debut) ?? 480);
    setDebut(fin);
    setFin(decaler(fin, duree > 0 ? duree : 120));
    setMatiere("");
    setEnseignantId("");
  }

  const erreurs = etat.erreurs;

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
          <Field id="matiere" label="Matière ou cours" required error={erreurs.matiere}>
            <input
              id="matiere"
              name="matiere"
              required
              maxLength={80}
              list="matieres-existantes"
              autoComplete="off"
              placeholder="Ex. Algorithmique, Comptabilité générale, Anglais"
              value={matiere}
              onChange={(e) => setMatiere(e.target.value)}
              aria-invalid={!!erreurs.matiere || undefined}
              aria-describedby={idDescription("matiere", erreurs.matiere)}
              className={classeChamp(erreurs.matiere)}
            />
            <datalist id="matieres-existantes">
              {matieres.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <Field id="enseignantId" label="Enseignant" error={erreurs.enseignantId}>
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
