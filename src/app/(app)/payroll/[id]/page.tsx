import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa } from "@/lib/format";
import { nomEnseignant } from "@/lib/enseignants";
import { LABEL_MODE } from "@/lib/paiements";
import { STATUT_VACATION, formatHeures, type LigneDetailVacation } from "@/lib/paie";
import { lireMois } from "@/lib/heures-donnees";
import Badge from "@/components/ui/badge";
import PrintButton from "../../payments/[id]/print-button";
import PayForm from "./pay-form";
import { annulerValidation } from "../actions";

type VacationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
};

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function VacationPage({ params, searchParams }: VacationPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;
  const { nouveau } = await searchParams;

  const vacation = await db.vacation.findFirst({
    where: { id },
    include: {
      enseignant: true,
      valideePar: { include: { utilisateur: { select: { nom: true } } } },
      payeePar: { include: { utilisateur: { select: { nom: true } } } },
    },
  });
  if (!vacation) {
    notFound();
  }

  const detail = vacation.detail as LigneDetailVacation[];
  const payee = vacation.statut === "PAYEE";
  const libelleMois = formateurMois.format(lireMois(vacation.mois).debut);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/payroll?mois=${vacation.mois}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink print:hidden"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Paie des vacataires
      </Link>

      {nouveau && !payee && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-success-soft p-4 text-success print:hidden">
          <CheckCircle2 size={28} aria-hidden="true" />
          <p className="font-semibold">Bulletin {vacation.numero} validé</p>
        </div>
      )}

      <div className="mt-4 mb-4 flex flex-wrap gap-3 print:hidden">
        <PrintButton />
      </div>

      {/* Le bulletin (imprimable) */}
      <article className="rounded-lg border border-border bg-surface-200 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <p className="text-sm text-ink-muted">{institut.nom}</p>
            <h1 className="mt-1 text-xl font-semibold">Bulletin de vacation</h1>
            <p className="text-sm text-ink-muted">
              N° {vacation.numero} · <span className="capitalize">{libelleMois}</span>
            </p>
          </div>
          <Badge ton={STATUT_VACATION[vacation.statut].ton}>{STATUT_VACATION[vacation.statut].label}</Badge>
        </div>

        <div className="mt-6">
          <p className="text-sm text-ink-muted">Professeur</p>
          <p className="font-semibold">{nomEnseignant(vacation.enseignant)}</p>
          {vacation.enseignant.telephone && <p className="text-sm text-ink-muted">{vacation.enseignant.telephone}</p>}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-muted">
              <th className="py-2 font-medium">Matière</th>
              <th className="py-2 font-medium">Classe</th>
              <th className="py-2 text-right font-medium">Heures</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((d) => (
              <tr key={`${d.classe}-${d.matiere}`} className="border-b border-border">
                <td className="py-2">{d.matiere}</td>
                <td className="py-2 text-ink-muted">{d.classe}</td>
                <td className="py-2 text-right tabular-nums">{formatHeures(d.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">
              {formatHeures(vacation.minutes)} × {formatFcfa(vacation.tarifHoraire)} / h
            </dt>
            <dd className="tabular-nums">{formatFcfa(vacation.montantBrut)}</dd>
          </div>
          {vacation.ajustement !== 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">
                {vacation.ajustement < 0 ? "Retenue" : "Prime"} · {vacation.motifAjustement}
              </dt>
              <dd className="tabular-nums">
                {vacation.ajustement > 0 ? "+" : ""}
                {formatFcfa(vacation.ajustement)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <dt>Net à payer</dt>
            <dd className="tabular-nums">{formatFcfa(vacation.montantNet)}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-ink-muted">
          Validé le {formatDate(vacation.createdAt)} par {vacation.valideePar.utilisateur.nom}.
          {payee && vacation.payeeLe && vacation.modePaiement && (
            <>
              {" "}
              Payé le {formatDate(vacation.payeeLe)} ({LABEL_MODE[vacation.modePaiement]}
              {vacation.referencePaiement ? ` · réf. ${vacation.referencePaiement}` : ""})
              {vacation.payeePar ? ` par ${vacation.payeePar.utilisateur.nom}` : ""}.
            </>
          )}
        </p>
      </article>

      {!payee && (
        <div className="mt-6 space-y-4">
          <PayForm vacationId={vacation.id} />
          {membre.role === "DIRECTEUR" && (
            <form action={annulerValidation} className="print:hidden">
              <input type="hidden" name="vacationId" value={vacation.id} />
              <button type="submit" className="cursor-pointer text-sm font-medium text-danger hover:underline">
                Erreur ? Annuler la validation (le bulletin repasse « à valider »)
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
