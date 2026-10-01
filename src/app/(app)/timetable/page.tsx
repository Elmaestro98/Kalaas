import Link from "next/link";
import { Download } from "lucide-react";
import { getContexte } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { dureeTotaleHebdo, minutesHebdo, nbSemaines } from "@/lib/emploi-du-temps";
import { chargerEmploiDuTemps, type Vue } from "@/lib/emploi-du-temps-donnees";
import { nomEnseignant } from "@/lib/enseignants";
import AssignmentsPanel, { type LigneAffectation } from "./assignments-panel";
import EntitySelect from "./entity-select";
import SlotForm from "./slot-form";
import WeekGrid from "./week-grid";

type TimetablePageProps = {
  searchParams: Promise<{ vue?: string; id?: string }>;
};

const ONGLETS: { vue: Vue; label: string }[] = [
  { vue: "classe", label: "Classes" },
  { vue: "enseignant", label: "Enseignants" },
  { vue: "salle", label: "Salles" },
];

export default async function TimetablePage({ searchParams }: TimetablePageProps) {
  const { membre, db } = await getContexte();
  const params = await searchParams;

  const estFormateur = membre.role === "FORMATEUR";
  const estDirecteur = membre.role === "DIRECTEUR";

  // Un formateur ne voit que son propre emploi du temps
  const vue: Vue = estFormateur
    ? "enseignant"
    : params.vue === "enseignant" || params.vue === "salle"
      ? params.vue
      : "classe";

  const [sessions, fiches, salles, maFiche] = await Promise.all([
    db.session.findMany({
      where: { dateFin: { gte: dateDuJour() } },
      orderBy: [{ dateDebut: "asc" }],
      include: {
        formation: { select: { intitule: true } },
        anneeAcademique: { select: { libelle: true } },
      },
    }),
    db.enseignant.findMany({ where: { actif: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    db.salle.findMany({ where: { active: true }, orderBy: { nom: "asc" } }),
    // Fiche professeur reliée au compte connecté (pour un formateur)
    db.enseignant.findFirst({ where: { membreId: membre.id } }),
  ]);

  const enseignants = fiches.map((e) => ({ id: e.id, nom: nomEnseignant(e) }));

  // Options de la liste selon la vue
  let groupes: { label: string; options: { id: string; label: string }[] }[];
  if (vue === "classe") {
    const parAnnee = new Map<string, { id: string; label: string }[]>();
    for (const s of sessions) {
      const cle = s.anneeAcademique ? `Année ${s.anneeAcademique.libelle}` : "Formations courtes";
      parAnnee.set(cle, [...(parAnnee.get(cle) ?? []), { id: s.id, label: `${s.formation.intitule} · ${s.nom}` }]);
    }
    groupes = [...parAnnee.entries()].map(([label, options]) => ({ label, options }));
  } else if (vue === "enseignant") {
    groupes = [{ label: "", options: enseignants.map((e) => ({ id: e.id, label: e.nom })) }];
  } else {
    groupes = [{ label: "", options: salles.map((s) => ({ id: s.id, label: s.nom })) }];
  }

  const idsPossibles = groupes.flatMap((g) => g.options.map((o) => o.id));
  const id = estFormateur
    ? maFiche?.id
    : params.id && idsPossibles.includes(params.id)
      ? params.id
      : idsPossibles[0];

  const emploi = id ? await chargerEmploiDuTemps(db, vue, id) : null;

  const sessionChoisie = vue === "classe" ? sessions.find((s) => s.id === id) : undefined;
  const semaines = sessionChoisie ? nbSemaines(sessionChoisie.dateDebut, sessionChoisie.dateFin) : 0;

  // Classe : programme de sa formation, affectations et séances réellement faites (appels)
  const [programme, affectationsBrutes, seancesFaites] = sessionChoisie
    ? await Promise.all([
        db.matiere.findMany({
          where: { formationId: sessionChoisie.formationId, active: true },
          orderBy: [{ semestre: "asc" }, { ordre: "asc" }, { intitule: "asc" }],
          select: { id: true, intitule: true, volumeHoraire: true, enseignantHabituelId: true },
        }),
        db.affectation.findMany({
          where: { sessionId: sessionChoisie.id },
          orderBy: { matiere: "asc" },
          include: { enseignant: { select: { prenom: true, nom: true } } },
        }),
        db.seance.findMany({
          where: { sessionId: sessionChoisie.id, matiereId: { not: null } },
          select: { matiereId: true, heureDebut: true, heureFin: true },
        }),
      ])
    : [[], [], []];

  const affectations: LigneAffectation[] = affectationsBrutes.map((a) => {
    const coursMatiere = (emploi?.creneaux ?? []).filter((c) =>
      a.matiereId ? c.matiereId === a.matiereId : c.matiere.toLowerCase() === a.matiere.toLowerCase(),
    );
    const minutesRealisees = seancesFaites
      .filter((s) => s.matiereId === a.matiereId)
      .reduce((t, s) => t + ((s.heureFin ?? 0) - (s.heureDebut ?? 0)), 0);
    return {
      id: a.id,
      matiere: a.matiere,
      matiereId: a.matiereId,
      enseignantId: a.enseignantId,
      enseignant: nomEnseignant(a.enseignant),
      volumeHoraire: a.volumeHoraire,
      heuresHebdo: dureeTotaleHebdo(coursMatiere),
      heuresProgrammees: Math.round((minutesHebdo(coursMatiere) / 60) * semaines),
      heuresRealisees: Math.round((minutesRealisees / 60) * 10) / 10,
    };
  });

  // Matières du programme sans professeur dans cette classe
  const nonAffectees = programme.filter((m) => !affectations.some((a) => a.matiereId === m.id));

  const messageVide = estFormateur
    ? "Votre compte n'est pas encore relié à une fiche professeur. Demandez à la direction de le faire."
    : vue === "classe"
      ? "Aucune session en cours. Ouvrez une session depuis les formations."
      : vue === "enseignant"
        ? "Aucun professeur. Ajoutez vos professeurs dans le menu Professeurs."
        : "Aucune salle. Ajoutez vos salles dans les Paramètres.";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Emplois du temps</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Semaine type, répétée chaque semaine pendant toute la session.
          </p>
        </div>
        {emploi && id && (
          <a
            href={`/timetable/pdf?vue=${vue}&id=${id}`}
            className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-5 font-medium text-navy-900 hover:opacity-90"
          >
            <Download size={18} aria-hidden="true" />
            Télécharger le PDF
          </a>
        )}
      </div>

      {!estFormateur && (
        <nav aria-label="Type d'emploi du temps" className="mt-6 inline-flex gap-1 rounded-md border border-border bg-surface-200 p-1">
          {ONGLETS.map((o) => (
            <Link
              key={o.vue}
              href={`/timetable?vue=${o.vue}`}
              aria-current={vue === o.vue ? "page" : undefined}
              className={`flex h-9 items-center rounded-sm px-4 text-sm ${
                vue === o.vue ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </nav>
      )}

      {!id ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="text-sm text-ink-muted">{messageVide}</p>
          {vue === "salle" && estDirecteur && (
            <Link href="/settings" className="mt-2 inline-block text-sm font-semibold">
              Ajouter des salles →
            </Link>
          )}
          {vue === "enseignant" && !estFormateur && (
            <Link href="/teachers" className="mt-2 inline-block text-sm font-semibold">
              Ajouter des professeurs →
            </Link>
          )}
        </div>
      ) : (
        <>
          {!estFormateur && (
            <div className="mt-4">
              <EntitySelect
                vue={vue}
                valeur={id}
                groupes={groupes}
                label={vue === "classe" ? "Classe" : vue === "enseignant" ? "Enseignant" : "Salle"}
              />
            </div>
          )}

          {emploi && (
            <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{emploi.titre}</h2>
                  <p className="text-sm text-ink-muted">{emploi.sousTitre}</p>
                </div>
                <p className="text-sm text-ink-muted">
                  {emploi.creneaux.length} cours · {dureeTotaleHebdo(emploi.creneaux)} par semaine
                </p>
              </div>

              {vue === "classe" && (
                <AssignmentsPanel
                  sessionId={id}
                  formationId={sessionChoisie?.formationId ?? ""}
                  affectations={affectations}
                  enseignants={enseignants}
                  programme={programme}
                  nonAffectees={nonAffectees.map((m) => ({
                    id: m.id,
                    intitule: m.intitule,
                    habituel: enseignants.find((e) => e.id === m.enseignantHabituelId)?.nom ?? null,
                  }))}
                  peutModifier={estDirecteur}
                />
              )}

              {vue === "classe" && estDirecteur && (
                <details
                  open={emploi.creneaux.length === 0}
                  className="group mb-5 rounded-lg border border-border bg-surface-200"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-gold-500 text-navy-900">+</span>
                      Ajouter un cours
                    </span>
                    <span className="text-sm font-normal text-ink-muted group-open:hidden">Afficher le formulaire</span>
                    <span className="hidden text-sm font-normal text-ink-muted group-open:inline">Replier</span>
                  </summary>
                  <div className="border-t border-border p-5">
                    <SlotForm
                      key={id}
                      sessionId={id}
                      enseignants={enseignants}
                      salles={salles.map((s) => ({ id: s.id, nom: s.nom }))}
                      formationId={sessionChoisie?.formationId ?? ""}
                      matieres={programme}
                      affectations={affectations.map((a) => ({ matiereId: a.matiereId, enseignantId: a.enseignantId }))}
                    />
                  </div>
                </details>
              )}

              <WeekGrid creneaux={emploi.creneaux} peutModifier={vue === "classe" && estDirecteur} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
