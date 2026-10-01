import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa } from "@/lib/format";
import { STATUT_ENSEIGNANT } from "@/lib/enseignants";
import { etatDesHeures, lireMois } from "@/lib/heures-donnees";
import Badge from "@/components/ui/badge";

type HoursPageProps = {
  searchParams: Promise<{ mois?: string }>;
};

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function cleMois(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function HoursPage({ searchParams }: HoursPageProps) {
  const { db } = await exigerRole("DIRECTEUR");
  const { mois } = await searchParams;
  const { debut, fin, cle } = lireMois(mois);

  const lignes = await etatDesHeures(db, debut, fin);
  const totalHeures = Math.round(lignes.reduce((s, l) => s + l.heures, 0) * 10) / 10;
  const totalMontant = lignes.reduce((s, l) => s + (l.montant ?? 0), 0);
  const totalSansAppel = lignes.reduce((s, l) => s + l.coursSansAppel, 0);

  const precedent = cleMois(new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() - 1, 1)));
  const suivant = cleMois(fin);
  const libelle = formateurMois.format(debut);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/teachers" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Professeurs
      </Link>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">État des heures</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Heures réellement faites (cours dont l&apos;appel a été enregistré) × tarif horaire.
          </p>
        </div>
        <a
          href={`/teachers/hours/export?mois=${cle}`}
          download
          className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-4 font-medium text-navy-900 hover:opacity-90"
        >
          <Download size={18} aria-hidden="true" />
          Exporter Excel
        </a>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/teachers/hours?mois=${precedent}`}
          aria-label="Mois précédent"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <p className="flex-1 text-center font-semibold capitalize">{libelle}</p>
        <Link
          href={`/teachers/hours?mois=${suivant}`}
          aria-label="Mois suivant"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Heures réalisées</p>
          <p className="mt-1 text-3xl font-bold text-gold-500 tabular-nums">{totalHeures} h</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Montant à payer</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatFcfa(totalMontant)}</p>
          <p className="mt-1 text-xs text-ink-muted">professeurs avec un tarif horaire</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Cours sans appel</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${totalSansAppel ? "text-warning" : ""}`}>{totalSansAppel}</p>
          <p className="mt-1 text-xs text-ink-muted">non comptés tant que l&apos;appel n&apos;est pas fait</p>
        </div>
      </div>

      {lignes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucun professeur.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {lignes.map((l) => (
            <li key={l.enseignantId} className="rounded-lg border border-border bg-surface-200 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-44 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/teachers/${l.enseignantId}`} className="font-semibold text-ink hover:underline">
                      {l.nom}
                    </Link>
                    <Badge ton={STATUT_ENSEIGNANT[l.statut].ton}>{STATUT_ENSEIGNANT[l.statut].label}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {l.coursFaits} cours faits · {l.tarifHoraire ? `${formatFcfa(l.tarifHoraire)} / h` : "pas de tarif horaire"}
                  </p>
                </div>
                {l.coursSansAppel > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                    <AlertTriangle size={14} aria-hidden="true" />
                    {l.coursSansAppel} sans appel
                  </span>
                )}
                <span className="w-20 text-right font-semibold tabular-nums">{l.heures} h</span>
                <span className="w-32 text-right text-lg font-bold tabular-nums">
                  {l.montant !== null ? formatFcfa(l.montant) : "—"}
                </span>
              </div>
              {l.detail.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-ink-muted">
                  {l.detail.map((d) => (
                    <li key={`${d.classe}-${d.matiere}`} className="flex justify-between gap-3">
                      <span className="truncate">
                        {d.matiere} · {d.classe}
                      </span>
                      <span className="shrink-0 tabular-nums">{d.heures} h</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Un cours « sans appel » n&apos;est pas compté : faites (ou rattrapez) l&apos;appel depuis la page Présences pour
        qu&apos;il entre dans l&apos;état. État indicatif, hors avances et retenues.
      </p>
    </div>
  );
}
