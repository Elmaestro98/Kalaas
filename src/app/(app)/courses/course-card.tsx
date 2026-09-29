import Link from "next/link";
import { formatNombre } from "@/lib/format";
import { repartirMontant } from "@/lib/echeancier";
import { CYCLES, codeNiveau, estLmd, type Cycle } from "@/lib/lmd";
import Badge from "@/components/ui/badge";

type CourseCardProps = {
  id: string;
  intitule: string;
  cycle: Cycle;
  niveau: number | null;
  dureeMois: number;
  fraisInscription: number;
  prixTotal: number;
  nbMensualites: number;
  nbSessions: number;
};

export default function CourseCard({
  id,
  intitule,
  cycle,
  niveau,
  dureeMois,
  fraisInscription,
  prixTotal,
  nbMensualites,
  nbSessions,
}: CourseCardProps) {
  const total = fraisInscription + prixTotal;
  const [mensualite = 0] = repartirMontant(prixTotal, nbMensualites);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-200 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]">
      <div className="h-1 bg-gold-500" aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold leading-snug">{intitule}</h2>
          {estLmd(cycle) ? (
            <Badge ton={CYCLES[cycle].ton}>{codeNiveau(cycle, niveau)}</Badge>
          ) : (
            <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              {dureeMois} mois
            </span>
          )}
        </div>

        <div>
          <p className="text-xs text-ink-muted">{estLmd(cycle) ? "Coût annuel" : "Coût total"}</p>
          <p className="whitespace-nowrap">
            <span className="text-2xl font-bold tabular-nums">{formatNombre(total)}</span>{" "}
            <span className="text-sm text-ink-muted">FCFA</span>
          </p>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Inscription (une fois)</dt>
              <dd className="font-medium tabular-nums">
                {fraisInscription > 0 ? `${formatNombre(fraisInscription)} FCFA` : "Gratuite"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Mensualités</dt>
              <dd className="font-medium tabular-nums">
                {nbMensualites} × {formatNombre(mensualite)} FCFA
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-ink-muted">
            {nbSessions} session{nbSessions > 1 ? "s" : ""}
          </span>
          <Link href={`/courses/sessions/new?formation=${id}`} className="font-semibold">
            Ouvrir une session →
          </Link>
        </div>
      </div>
    </article>
  );
}
