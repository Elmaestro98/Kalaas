import Link from "next/link";
import { getContexte } from "@/lib/tenant";
import { formatFcfa, formatNombre } from "@/lib/format";
import { dateDuJour } from "@/lib/echeancier";
import { LABEL_MODE, TON_MODE } from "@/lib/paiements";
import Badge from "@/components/ui/badge";
import TrainerDashboard from "./trainer-dashboard";

const formateurHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });

export default async function DashboardPage() {
  const { institut, membre, db } = await getContexte();

  // Un formateur voit sa semaine de cours, jamais les chiffres financiers
  if (membre.role === "FORMATEUR") {
    return <TrainerDashboard />;
  }

  const aujourdhui = dateDuJour();
  const demain = new Date(aujourdhui.getTime() + 24 * 60 * 60 * 1000);
  const debutMois = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), 1));
  const nonAnnule = { annulation: { is: null } };

  const [jour, mois, dues, enRetard, nbApprenants, derniers] = await Promise.all([
    db.paiement.aggregate({
      where: { ...nonAnnule, date: { gte: aujourdhui, lt: demain } },
      _sum: { montant: true },
      _count: true,
    }),
    db.paiement.aggregate({
      where: { ...nonAnnule, date: { gte: debutMois, lt: demain } },
      _sum: { montant: true },
    }),
    db.echeance.aggregate({
      where: { statut: { not: "ANNULEE" }, inscription: { statut: "ACTIVE" } },
      _sum: { montantDu: true, montantPaye: true },
    }),
    db.echeance.findMany({
      where: {
        statut: { in: ["A_PAYER", "PARTIEL"] },
        dateLimite: { lt: aujourdhui },
        inscription: { statut: "ACTIVE" },
      },
      select: { inscription: { select: { apprenantId: true } } },
    }),
    db.inscription.count({ where: { statut: "ACTIVE" } }),
    db.paiement.findMany({
      where: nonAnnule,
      orderBy: { date: "desc" },
      take: 5,
      include: { apprenant: { select: { prenom: true, nom: true } } },
    }),
  ]);

  const resteARecouvrer = (dues._sum.montantDu ?? 0) - (dues._sum.montantPaye ?? 0);
  const nbEnRetard = new Set(enRetard.map((e) => e.inscription.apprenantId)).size;
  const prenom = membre.utilisateur.nom.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Bonjour {prenom}</h1>
      <p className="mt-1 text-ink-muted">
        {institut.nom}
        {institut.ville && <> · {institut.ville}</>}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Encaissé en {formateurMois.format(aujourdhui)}</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-3xl font-bold text-gold-500 tabular-nums">
              {formatNombre(mois._sum.montant ?? 0)}
            </span>{" "}
            <span className="text-sm text-white/70">FCFA</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Encaissé aujourd&apos;hui</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-3xl font-bold tabular-nums">{formatNombre(jour._sum.montant ?? 0)}</span>{" "}
            <span className="text-sm text-ink-muted">FCFA</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {jour._count} règlement{jour._count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">Reste à recouvrer</p>
            {nbEnRetard > 0 && <Badge ton="danger">{nbEnRetard} en retard</Badge>}
          </div>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-3xl font-bold tabular-nums">{formatNombre(resteARecouvrer)}</span>{" "}
            <span className="text-sm text-ink-muted">FCFA</span>
          </p>
          <Link href="/unpaid" className="mt-1 inline-block text-xs font-semibold">
            Voir les retards →
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Inscriptions actives</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{nbApprenants}</p>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Derniers paiements</h2>
          <Link href="/payments" className="text-sm font-semibold">
            Journal de caisse →
          </Link>
        </div>
        {derniers.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucun paiement enregistré pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {derniers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/payments/${p.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm text-ink"
                >
                  <span className="w-14 tabular-nums text-ink-muted">{formateurHeure.format(p.date)}</span>
                  <span className="min-w-32 flex-1 font-medium">
                    {p.apprenant.prenom} {p.apprenant.nom}
                  </span>
                  <Badge ton={TON_MODE[p.mode]}>{LABEL_MODE[p.mode]}</Badge>
                  <span className="w-28 text-right font-semibold tabular-nums">{formatFcfa(p.montant)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
