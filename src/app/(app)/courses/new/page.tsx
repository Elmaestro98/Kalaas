import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import CourseForm from "./course-form";

export default async function NewCoursePage() {
  const { db } = await exigerRole("DIRECTEUR");

  // Filières déjà utilisées, proposées à la saisie pour éviter les fautes de frappe
  const lignes = await db.formation.findMany({
    where: { filiere: { not: null } },
    distinct: ["filiere"],
    select: { filiere: true },
    orderBy: { filiere: "asc" },
  });
  const filieres = lignes.map((l) => l.filiere).filter((f): f is string => Boolean(f));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Formations
      </Link>

      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Nouvelle formation</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Ajoutez une formation à votre catalogue. Vous pourrez ensuite ouvrir des sessions.
      </p>

      <div className="rounded-lg border border-border bg-surface-200 p-5 shadow-[var(--shadow-card)] lg:p-8">
        <CourseForm filieres={filieres} />
      </div>
    </div>
  );
}
