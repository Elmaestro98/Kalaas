import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa } from "@/lib/format";
import { lireMois } from "@/lib/heures-donnees";
import { LABEL_MODE, TON_MODE } from "@/lib/paiements";
import { evolution, rapportDuMois, situationImpayes } from "@/lib/rapports-donnees";
import Badge from "@/components/ui/badge";

type ReportsPageProps = {
  searchParams: Promise<{ mois?: string }>;
};

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function cleMois(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function part(montant: number, total: number) {
  return total > 0 ? `${Math.round((montant / total) * 100)} %` : "—";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { db } = await exigerRole("DIRECTEUR");
  const { mois } = await searchParams;
  const { debut, fin, cle } = lireMois(mois);

  const [rapport, impayes, historique] = await Promise.all([
    rapportDuMois(db, debut, fin, cle),
    situationImpayes(db),
    evolution(db, fin, 6),
  ]);

  const precedent = cleMois(new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() - 1, 1)));
  const suivant = cleMois(fin);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Rapports</h1>
          <p className="mt-1 text-sm text-ink-muted">L&apos;argent qui rentre, l&apos;argent qui sort, et ce qui reste dû.</p>
        </div>
        <a
          href={`/reports/export?mois=${cle}`}
          download
          className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-4 font-medium text-navy-900 hover:opacity-90"
        >
          <Download size={18} aria-hidden="true" />
          Exporter Excel
        </a>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/reports?mois=${precedent}`}
          aria-label="Mois précédent"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <p className="flex-1 text-center font-semibold capitalize">{formateurMois.format(debut)}</p>
        <Link
          href={`/reports?mois=${suivant}`}
          aria-label="Mois suivant"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      {/* Les chiffres clés du mois */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Encaissé</p>
          <p className="mt-1 text-2xl font-bold text-success tabular-nums">{formatFcfa(rapport.encaisse)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {rapport.nbPaiements} paiement{rapport.nbPaiements > 1 ? "s" : ""}
            {rapport.annule > 0 && <> · {formatFcfa(rapport.annule)} annulés</>}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Paie des vacataires versée</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatFcfa(rapport.paieVersee)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {rapport.nbBulletins} bulletin{rapport.nbBulletins > 1 ? "s" : ""}
            {rapport.paieAPayer > 0 && <> · {formatFcfa(rapport.paieAPayer)} encore à payer</>}
          </p>
        </div>
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Solde du mois</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${rapport.solde < 0 ? "text-danger" : "text-gold-500"}`}>
            {formatFcfa(rapport.solde)}
          </p>
          <p className="mt-1 text-xs text-white/70">encaissé − paie versée</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">Reste à recouvrer</p>
            {impayes.apprenantsEnRetard > 0 && <Badge ton="danger">{impayes.apprenantsEnRetard} en retard</Badge>}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatFcfa(impayes.resteARecouvrer)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            à ce jour, dont {formatFcfa(impayes.enRetard)} en retard ·{" "}
            <Link href="/unpaid" className="font-semibold">
              voir
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Encaissements par moyen de paiement */}
        <section className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Encaissements par moyen de paiement</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {rapport.parMode.map((m) => (
                <tr key={m.mode} className="border-b border-border last:border-0">
                  <td className="py-2.5">
                    <Badge ton={TON_MODE[m.mode]}>{LABEL_MODE[m.mode]}</Badge>
                  </td>
                  <td className="py-2.5 text-ink-muted tabular-nums">{m.nombre}</td>
                  <td className="py-2.5 text-right text-ink-muted tabular-nums">{part(m.montant, rapport.encaisse)}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{formatFcfa(m.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Encaissements par formation */}
        <section className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Encaissements par formation</h2>
          {rapport.parFormation.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Aucun encaissement ce mois-ci.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {rapport.parFormation.map((f) => (
                  <tr key={f.formation} className="border-b border-border last:border-0">
                    <td className="py-2.5">{f.formation}</td>
                    <td className="py-2.5 text-right text-ink-muted tabular-nums">{part(f.montant, rapport.encaisse)}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{formatFcfa(f.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Les 6 derniers mois */}
      <section className="mt-6 rounded-lg border border-border bg-surface-200 p-5">
        <h2 className="font-semibold">Les 6 derniers mois</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-md text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="py-2 font-medium">Mois</th>
                <th className="py-2 text-right font-medium">Encaissé</th>
                <th className="py-2 text-right font-medium">Paie versée</th>
                <th className="py-2 text-right font-medium">Solde</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((l) => (
                <tr key={l.cle} className={`border-b border-border last:border-0 ${l.cle === cle ? "font-semibold" : ""}`}>
                  <td className="py-2.5 capitalize">
                    <Link href={`/reports?mois=${l.cle}`} className="text-ink hover:underline">
                      {formateurMois.format(l.debut)}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{formatFcfa(l.encaisse)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatFcfa(l.paie)}</td>
                  <td className={`py-2.5 text-right tabular-nums ${l.solde < 0 ? "text-danger" : ""}`}>
                    {formatFcfa(l.solde)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-xs text-ink-muted">
        Les paiements annulés ne sont pas comptés. La paie est comptée le mois où elle a été versée. Les autres dépenses
        (loyer, salaires des permanents…) ne sont pas encore suivies dans Kalaas.
      </p>
    </div>
  );
}
