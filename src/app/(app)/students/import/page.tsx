import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import ImportWizard from "./import-wizard";

export default async function ImportPage() {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const sessions = await db.session.findMany({
    where: { dateFin: { gte: dateDuJour() }, formation: { active: true } },
    orderBy: { dateDebut: "asc" },
    include: {
      formation: { select: { intitule: true } },
      anneeAcademique: { select: { libelle: true } },
    },
  });

  const classes = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.intitule} · ${s.nom}`,
    groupe: s.anneeAcademique ? `Année ${s.anneeAcademique.libelle}` : "Formations courtes",
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Apprenants
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Importer des apprenants</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Reprenez vos listes Excel existantes : Kalaas vérifie chaque ligne avant d&apos;enregistrer quoi que ce soit.
      </p>
      <ImportWizard classes={classes} />
    </div>
  );
}
