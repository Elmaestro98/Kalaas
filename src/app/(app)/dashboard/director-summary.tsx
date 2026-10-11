import Link from "next/link";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import type { DbInstitut } from "@/lib/prisma";
import { formatDate, formatFcfa } from "@/lib/format";
import { membresAvecCaisse } from "@/lib/caisse";
import { rapportDuMois } from "@/lib/rapports-donnees";

const JOUR_MS = 86_400_000;

type DirectorSummaryProps = {
  db: DbInstitut;
  aujourdhui: Date;
  debutMois: Date;
};

// Bloc réservé au directeur : le vrai résultat du mois et ce qui demande son attention
export default async function DirectorSummary({ db, aujourdhui, debutMois }: DirectorSummaryProps) {
  const finMois = new Date(Date.UTC(debutMois.getUTCFullYear(), debutMois.getUTCMonth() + 1, 1));
  const cle = `${debutMois.getUTCFullYear()}-${String(debutMois.getUTCMonth() + 1).padStart(2, "0")}`;

  const [rapport, bulletins, membres, cloturesDuJour, ecarts] = await Promise.all([
    rapportDuMois(db, debutMois, finMois, cle),
    db.vacation.aggregate({ where: { statut: "VALIDEE" }, _sum: { montantNet: true }, _count: true }),
    membresAvecCaisse(db, aujourdhui),
    db.clotureCaisse.findMany({ where: { date: aujourdhui }, select: { caissierId: true } }),
    db.clotureCaisse.findMany({
      where: { date: { gte: new Date(aujourdhui.getTime() - 7 * JOUR_MS) }, ecart: { not: 0 } },
      orderBy: { date: "desc" },
      include: { caissier: { select: { utilisateur: { select: { nom: true } } } } },
    }),
  ]);

  const cloturees = new Set(cloturesDuJour.map((c) => c.caissierId));
  const nonCloturees = membres.filter((m) => !cloturees.has(m.id));
  const aPayer = bulletins._sum.montantNet ?? 0;
  const rienAFaire = bulletins._count === 0 && nonCloturees.length === 0 && ecarts.length === 0;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      {/* Résultat du mois */}
      <section className="rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Résultat du mois</h2>
          <Link href="/reports" className="text-sm font-semibold">
            Rapports →
          </Link>
        </div>
        <dl className="mt-3 divide-y divide-border text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-muted">Encaissé</dt>
            <dd className="font-semibold text-success tabular-nums">{formatFcfa(rapport.encaisse)}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-muted">
              <Link href="/payroll" className="text-ink-muted hover:underline">
                Paie des vacataires versée
              </Link>
            </dt>
            <dd className="tabular-nums">− {formatFcfa(rapport.paieVersee)}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-muted">
              <Link href="/expenses" className="text-ink-muted hover:underline">
                Dépenses
              </Link>
            </dt>
            <dd className="tabular-nums">− {formatFcfa(rapport.depenses)}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="font-semibold">Solde</dt>
            <dd className={`text-lg font-bold tabular-nums ${rapport.solde < 0 ? "text-danger" : ""}`}>
              {formatFcfa(rapport.solde)}
            </dd>
          </div>
        </dl>
      </section>

      {/* À surveiller */}
      <section className="rounded-lg border border-border bg-surface-200 p-5">
        <h2 className="font-semibold">À surveiller</h2>
        {rienAFaire ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 size={18} aria-hidden="true" />
            Rien en attente.
          </p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {bulletins._count > 0 && (
              <li>
                <Link href="/payroll" className="flex items-start gap-2 text-ink hover:underline">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    {bulletins._count} bulletin{bulletins._count > 1 ? "s" : ""} de vacation à payer ·{" "}
                    <b className="tabular-nums">{formatFcfa(aPayer)}</b>
                  </span>
                </Link>
              </li>
            )}
            {nonCloturees.length > 0 && (
              <li>
                <Link href="/payments/closing" className="flex items-start gap-2 text-ink hover:underline">
                  <Lock size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    Caisse{nonCloturees.length > 1 ? "s" : ""} non clôturée{nonCloturees.length > 1 ? "s" : ""}{" "}
                    aujourd&apos;hui : {nonCloturees.map((m) => m.nom).join(", ")}
                  </span>
                </Link>
              </li>
            )}
            {ecarts.map((e) => (
              <li key={e.id}>
                <Link href="/payments/closing" className="flex items-start gap-2 text-ink hover:underline">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                  <span>
                    Écart de caisse de{" "}
                    <b className="tabular-nums">
                      {e.ecart > 0 ? "+" : "−"}
                      {formatFcfa(Math.abs(e.ecart))}
                    </b>{" "}
                    · {e.caissier.utilisateur.nom}, {formatDate(e.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
