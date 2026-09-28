import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import CourseCard from "./course-card";
import SessionsList, { type LigneSession } from "./sessions-list";

export default async function CoursesPage() {
  const { db } = await exigerRole("DIRECTEUR");

  const [formations, sessions] = await Promise.all([
    db.formation.findMany({
      where: { active: true },
      orderBy: { intitule: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
    db.session.findMany({
      orderBy: { dateDebut: "desc" },
      include: {
        formation: { select: { intitule: true } },
        formateur: { include: { utilisateur: { select: { nom: true } } } },
        _count: { select: { inscriptions: { where: { statut: "ACTIVE" } } } },
      },
    }),
  ]);

  const lignesSessions: LigneSession[] = sessions.map((s) => ({
    id: s.id,
    nom: s.nom,
    formation: s.formation.intitule,
    dateDebut: s.dateDebut,
    dateFin: s.dateFin,
    horaires: s.horaires,
    formateur: s.formateur?.utilisateur.nom ?? null,
    inscrits: s._count.inscriptions,
    capacite: s.capacite,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Formations</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formations.length} formation{formations.length > 1 ? "s" : ""} ·{" "}
            {sessions.length} session{sessions.length > 1 ? "s" : ""}
          </p>
        </div>
        {formations.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/courses/sessions/new"
              className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-5 font-medium text-ink hover:bg-surface-100"
            >
              <Plus size={18} aria-hidden="true" />
              Nouvelle session
            </Link>
            <Link
              href="/courses/new"
              className="flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
            >
              <Plus size={18} aria-hidden="true" />
              Nouvelle formation
            </Link>
          </div>
        )}
      </div>

      {formations.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-surface-200 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <BookOpen size={22} aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold">Aucune formation pour l&apos;instant</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            Créez votre première formation : son prix et ses mensualités serviront à
            générer l&apos;échéancier de chaque apprenant.
          </p>
          <Link
            href="/courses/new"
            className="mt-6 flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
          >
            <Plus size={18} aria-hidden="true" />
            Créer une formation
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formations.map((formation) => (
            <CourseCard
              key={formation.id}
              id={formation.id}
              intitule={formation.intitule}
              dureeMois={formation.dureeMois}
              fraisInscription={formation.fraisInscription}
              prixTotal={formation.prixTotal}
              nbMensualites={formation.nbMensualites}
              nbSessions={formation._count.sessions}
            />
          ))}
        </div>
      )}

      {formations.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Sessions</h2>
          <SessionsList sessions={lignesSessions} />
        </section>
      )}
    </div>
  );
}
