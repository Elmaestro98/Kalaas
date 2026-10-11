import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa } from "@/lib/format";
import { nomEnseignant } from "@/lib/enseignants";
import { etatDesHeures, lireMois } from "@/lib/heures-donnees";
import { STATUT_VACATION, calculerBrut, formatHeures } from "@/lib/paie";
import Badge from "@/components/ui/badge";
import ValidateForm from "./validate-form";

type PayrollPageProps = {
  searchParams: Promise<{ mois?: string }>;
};

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function cleMois(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";
  const { mois } = await searchParams;
  const { debut, fin, cle } = lireMois(mois);
  const moisFutur = cle > lireMois(undefined).cle;

  const [lignes, vacations] = await Promise.all([
    etatDesHeures(db, debut, fin),
    db.vacation.findMany({
      where: { mois: cle },
      include: { enseignant: { select: { prenom: true, nom: true } } },
    }),
  ]);

  const vacationDe = new Map(vacations.map((v) => [v.enseignantId, v]));
  // Vacataires qui ont fait des heures ce mois, sans bulletin
  const aValider = lignes.filter((l) => l.statut === "VACATAIRE" && l.minutes > 0 && !vacationDe.has(l.enseignantId));

  const totalAValider = aValider.reduce((s, l) => s + (l.tarifHoraire ? calculerBrut(l.minutes, l.tarifHoraire) : 0), 0);
  const totalAPayer = vacations.filter((v) => v.statut === "VALIDEE").reduce((s, v) => s + v.montantNet, 0);
  const totalPaye = vacations.filter((v) => v.statut === "PAYEE").reduce((s, v) => s + v.montantNet, 0);

  const precedent = cleMois(new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() - 1, 1)));
  const suivant = cleMois(fin);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Paie des vacataires</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Heures faites (appels enregistrés) × tarif horaire. Validez le bulletin, puis enregistrez le paiement.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/payroll?mois=${precedent}`}
          aria-label="Mois précédent"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <p className="flex-1 text-center font-semibold capitalize">{formateurMois.format(debut)}</p>
        <Link
          href={`/payroll?mois=${suivant}`}
          aria-label="Mois suivant"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">À valider</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatFcfa(totalAValider)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {aValider.length} vacataire{aValider.length > 1 ? "s" : ""}, montant brut
          </p>
        </div>
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Validé, à payer</p>
          <p className="mt-1 text-2xl font-bold text-gold-500 tabular-nums">{formatFcfa(totalAPayer)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Déjà payé</p>
          <p className="mt-1 text-2xl font-bold text-success tabular-nums">{formatFcfa(totalPaye)}</p>
        </div>
      </div>

      {/* Bulletins à valider */}
      <h2 className="mt-8 text-lg font-semibold">À valider</h2>
      {moisFutur ? (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
          Ce mois n&apos;a pas encore commencé.
        </p>
      ) : aValider.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
          Aucun bulletin à valider pour ce mois.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {aValider.map((l) => {
            const brut = l.tarifHoraire ? calculerBrut(l.minutes, l.tarifHoraire) : null;
            return (
              <li key={l.enseignantId} className="rounded-lg border border-border bg-surface-200 p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-44 flex-1">
                    <Link href={`/teachers/${l.enseignantId}`} className="font-semibold text-ink hover:underline">
                      {l.nom}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      {l.coursFaits} cours · {formatHeures(l.minutes)} ·{" "}
                      {l.tarifHoraire ? `${formatFcfa(l.tarifHoraire)} / h` : "pas de tarif horaire"}
                    </p>
                  </div>
                  {l.coursSansAppel > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                      <AlertTriangle size={14} aria-hidden="true" />
                      {l.coursSansAppel} sans appel
                    </span>
                  )}
                  <span className="w-32 text-right text-lg font-bold tabular-nums">
                    {brut !== null ? formatFcfa(brut) : "—"}
                  </span>
                  {estDirecteur && brut !== null && (
                    <ValidateForm key={`${l.enseignantId}-${cle}`} enseignantId={l.enseignantId} mois={cle} brut={brut} />
                  )}
                </div>
                {brut === null && (
                  <p className="mt-2 text-xs text-warning">
                    Renseignez le tarif horaire sur la fiche du professeur pour pouvoir valider.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Bulletins validés ou payés */}
      <h2 className="mt-8 text-lg font-semibold">Bulletins du mois</h2>
      {vacations.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
          Aucun bulletin validé.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
          {vacations
            .sort((a, b) => nomEnseignant(a.enseignant).localeCompare(nomEnseignant(b.enseignant), "fr"))
            .map((v) => (
              <li key={v.id}>
                <Link
                  href={`/payroll/${v.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-ink hover:bg-gold-100/50"
                >
                  <span className="min-w-44 flex-1">
                    <span className="block font-semibold">{nomEnseignant(v.enseignant)}</span>
                    <span className="text-xs text-ink-muted">
                      {v.numero} · {formatHeures(v.minutes)}
                    </span>
                  </span>
                  <Badge ton={STATUT_VACATION[v.statut].ton}>{STATUT_VACATION[v.statut].label}</Badge>
                  <span className="w-32 text-right font-bold tabular-nums">{formatFcfa(v.montantNet)}</span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Un cours « sans appel » n&apos;est pas compté : faites l&apos;appel depuis la page Présences avant de valider.
        Une fois validé, le bulletin est figé, même si les heures changent ensuite.
      </p>
    </div>
  );
}
