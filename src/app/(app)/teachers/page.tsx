import Link from "next/link";
import { Link2, Plus } from "lucide-react";
import type { Enseignant } from "@prisma/client";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { dureeTotaleHebdo } from "@/lib/emploi-du-temps";
import { STATUT_ENSEIGNANT, initialesEnseignant, nomEnseignant } from "@/lib/enseignants";
import Badge from "@/components/ui/badge";

type Cours = { heureDebut: number; heureFin: number };

function Ligne({ e, cours }: { e: Enseignant; cours: Cours[] }) {
  return (
    <li>
      <Link
        href={`/teachers/${e.id}`}
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-ink hover:bg-gold-100/50 ${
          e.actif ? "" : "opacity-60"
        }`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
          {initialesEnseignant(e)}
        </span>
        <span className="min-w-40 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            {nomEnseignant(e)}
            {e.membreId && <Link2 size={14} className="text-ink-muted" aria-label="Compte Kalaas relié" />}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {[e.specialite, e.telephone].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>
        <span className="text-right text-sm">
          <span className="block font-semibold tabular-nums">{dureeTotaleHebdo(cours)}</span>
          <span className="text-xs text-ink-muted">{cours.length} cours / semaine</span>
        </span>
        <Badge ton={STATUT_ENSEIGNANT[e.statut].ton}>{STATUT_ENSEIGNANT[e.statut].label}</Badge>
      </Link>
    </li>
  );
}

export default async function TeachersPage() {
  const { membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";

  const [enseignants, creneaux] = await Promise.all([
    db.enseignant.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }, { prenom: "asc" }] }),
    db.creneau.findMany({
      where: { enseignantId: { not: null }, session: { dateFin: { gte: dateDuJour() } } },
      select: { enseignantId: true, heureDebut: true, heureFin: true },
    }),
  ]);

  const coursDe = (id: string) => creneaux.filter((c) => c.enseignantId === id);
  const actifs = enseignants.filter((e) => e.actif);
  const inactifs = enseignants.filter((e) => !e.actif);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Professeurs</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {actifs.length} professeur{actifs.length > 1 ? "s" : ""} actif{actifs.length > 1 ? "s" : ""}
          </p>
        </div>
        {estDirecteur && (
          <Link
            href="/teachers/new"
            className="flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
          >
            <Plus size={18} aria-hidden="true" />
            Nouveau professeur
          </Link>
        )}
      </div>

      {enseignants.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">Aucun professeur pour l&apos;instant</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ajoutez vos professeurs permanents et vacataires pour construire les emplois du temps. Un compte
            Kalaas n&apos;est pas nécessaire.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
            {actifs.map((e) => (
              <Ligne key={e.id} e={e} cours={coursDe(e.id)} />
            ))}
          </ul>

          {inactifs.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-ink-muted">
                {inactifs.length} professeur{inactifs.length > 1 ? "s" : ""} désactivé
                {inactifs.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
                {inactifs.map((e) => (
                  <Ligne key={e.id} e={e} cours={coursDe(e.id)} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
