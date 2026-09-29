import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import SessionForm from "./session-form";

type NewSessionPageProps = {
  searchParams: Promise<{ formation?: string }>;
};

export default async function NewSessionPage({ searchParams }: NewSessionPageProps) {
  const { db } = await exigerRole("DIRECTEUR");
  const { formation } = await searchParams;

  const [formations, membres, anneesBrutes] = await Promise.all([
    db.formation.findMany({
      where: { active: true },
      orderBy: [{ cycle: "asc" }, { filiere: "asc" }, { niveau: "asc" }, { intitule: "asc" }],
      select: { id: true, intitule: true, dureeMois: true, cycle: true },
    }),
    db.membre.findMany({
      where: { actif: true, role: { in: ["FORMATEUR", "DIRECTEUR"] } },
      include: { utilisateur: { select: { nom: true } } },
    }),
    db.anneeAcademique.findMany({ orderBy: { dateDebut: "desc" } }),
  ]);

  const annees = anneesBrutes.map((a) => ({
    id: a.id,
    libelle: a.libelle,
    dateDebut: a.dateDebut.toISOString(),
    dateFin: a.dateFin.toISOString(),
    enCours: a.enCours,
  }));

  const formateurs = membres
    .map((m) => ({ id: m.id, nom: m.utilisateur.nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Formations
      </Link>

      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Nouvelle session</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Ouvrez une promo pour pouvoir y inscrire des apprenants.
      </p>

      {formations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center">
          <p className="font-semibold">Créez d&apos;abord une formation</p>
          <Link href="/courses/new" className="mt-2 inline-block text-sm font-semibold">
            Nouvelle formation →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-200 p-5 shadow-[var(--shadow-card)] lg:p-8">
          <SessionForm
            formations={formations}
            formateurs={formateurs}
            annees={annees}
            formationInitiale={formations.some((f) => f.id === formation) ? formation : undefined}
          />
        </div>
      )}
    </div>
  );
}
