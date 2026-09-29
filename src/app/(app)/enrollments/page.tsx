import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa } from "@/lib/format";
import Badge from "@/components/ui/badge";
import { TYPE_INSCRIPTION } from "@/lib/lmd";

const STATUT_INSCRIPTION = {
  ACTIVE: { label: "Active", ton: "success" },
  ABANDON: { label: "Abandon", ton: "danger" },
  TERMINEE: { label: "Terminée", ton: "neutral" },
  TRANSFEREE: { label: "Transférée", ton: "info" },
} as const;

export default async function EnrollmentsPage() {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const inscriptions = await db.inscription.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      apprenant: { select: { id: true, prenom: true, nom: true, matricule: true } },
      session: {
        select: {
          nom: true,
          formation: { select: { intitule: true } },
          anneeAcademique: { select: { libelle: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Inscriptions</h1>
          <p className="mt-1 text-sm text-ink-muted">Les 100 dernières inscriptions</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/enrollments/new?mode=reinscription"
            className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-5 font-medium text-ink hover:bg-surface-100"
          >
            Réinscription
          </Link>
          <Link
            href="/enrollments/new"
            className="flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
          >
            <Plus size={18} aria-hidden="true" />
            Nouvelle inscription
          </Link>
        </div>
      </div>

      {inscriptions.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">Aucune inscription pour l&apos;instant</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
          {inscriptions.map((i) => (
            <li key={i.id}>
              <Link
                href={`/students/${i.apprenant.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm text-ink hover:bg-gold-100/50"
              >
                <span className="w-24 shrink-0 text-ink-muted">{formatDate(i.date)}</span>
                <span className="min-w-40 flex-1">
                  <span className="block font-semibold">
                    {i.apprenant.prenom} {i.apprenant.nom}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {i.apprenant.matricule && <span className="font-mono">{i.apprenant.matricule} · </span>}
                    {i.session.formation.intitule} · {i.session.anneeAcademique?.libelle ?? i.session.nom}
                  </span>
                </span>
                {i.type !== "NOUVELLE" && (
                  <Badge ton={TYPE_INSCRIPTION[i.type].ton}>{TYPE_INSCRIPTION[i.type].label}</Badge>
                )}
                {i.remiseType && (
                  <span className="text-xs text-success">
                    Remise{" "}
                    {i.remiseType === "POURCENTAGE" ? `${i.remiseValeur} %` : formatFcfa(i.remiseValeur)}
                  </span>
                )}
                <Badge ton={STATUT_INSCRIPTION[i.statut].ton}>{STATUT_INSCRIPTION[i.statut].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
