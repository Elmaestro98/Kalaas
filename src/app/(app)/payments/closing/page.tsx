import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { formatDate, formatFcfa } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/paiements";
import { bilanCaissier } from "@/lib/caisse";
import ClosingForm from "./closing-form";

const JOUR_MS = 86_400_000;

function Ecart({ valeur }: { valeur: number }) {
  if (valeur === 0) {
    return <span className="font-semibold text-success">Juste</span>;
  }
  return (
    <span className={`font-semibold tabular-nums ${valeur > 0 ? "text-warning" : "text-danger"}`}>
      {valeur > 0 ? "+" : "−"}
      {formatFcfa(Math.abs(valeur))}
    </span>
  );
}

export default async function ClosingPage() {
  const { membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";
  const aujourdhui = dateDuJour();

  const [bilan, maCloture] = await Promise.all([
    bilanCaissier(db, membre.id, aujourdhui),
    db.clotureCaisse.findFirst({ where: { caissierId: membre.id, date: aujourdhui } }),
  ]);

  // Vue direction : caisses du jour de tous les encaisseurs + historique récent
  const caissesDuJour = estDirecteur
    ? await (async () => {
        const encaisseurs = await db.paiement.findMany({
          where: { date: { gte: aujourdhui, lt: new Date(aujourdhui.getTime() + JOUR_MS) }, caissierId: { not: null } },
          distinct: ["caissierId"],
          select: { caissier: { select: { id: true, utilisateur: { select: { nom: true } } } } },
        });
        const clotures = await db.clotureCaisse.findMany({ where: { date: aujourdhui } });
        return Promise.all(
          encaisseurs
            .filter((e) => e.caissier)
            .map(async (e) => ({
              id: e.caissier!.id,
              nom: e.caissier!.utilisateur.nom,
              bilan: await bilanCaissier(db, e.caissier!.id, aujourdhui),
              cloture: clotures.find((c) => c.caissierId === e.caissier!.id) ?? null,
            })),
        );
      })()
    : [];

  const historique = await db.clotureCaisse.findMany({
    where: {
      date: { gte: new Date(aujourdhui.getTime() - 30 * JOUR_MS), lt: aujourdhui },
      ...(estDirecteur ? {} : { caissierId: membre.id }),
    },
    orderBy: [{ date: "desc" }],
    take: 30,
    include: { caissier: { select: { utilisateur: { select: { nom: true } } } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/payments"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Encaissements
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Clôture de caisse</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Chaque soir, comptez vos espèces : Kalaas les compare à vos encaissements du {formatDate(aujourdhui)}.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Bilan du jour */}
        <section className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Mes encaissements du jour</h2>
          <p className="text-xs text-ink-muted">
            {bilan.nbPaiements} paiement{bilan.nbPaiements > 1 ? "s" : ""}
            {bilan.nbAnnules > 0 && ` · ${bilan.nbAnnules} annulé${bilan.nbAnnules > 1 ? "s" : ""} (exclus)`}
          </p>

          <dl className="mt-4 divide-y divide-border text-sm">
            {MODES_PAIEMENT.map((m) => (
              <div key={m.valeur} className="flex items-center justify-between py-2.5">
                <dt className={m.valeur === "ESPECES" ? "font-semibold" : "text-ink-muted"}>
                  {m.label}
                  {m.valeur === "ESPECES" && <span className="ml-2 text-xs font-normal text-ink-muted">dans la caisse</span>}
                </dt>
                <dd className={`tabular-nums ${m.valeur === "ESPECES" ? "text-lg font-bold" : ""}`}>
                  {formatFcfa(bilan.parMode[m.valeur])}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <dt className="font-semibold">Total encaissé</dt>
              <dd className="font-semibold tabular-nums">{formatFcfa(bilan.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            Wave, Orange Money et virements arrivent directement sur les comptes : seules les espèces se comptent.
          </p>
        </section>

        {/* Clôture */}
        <aside className="rounded-lg border border-border bg-surface-200 p-5">
          {maCloture ? (
            <div>
              <p className="flex items-center gap-2 font-semibold text-success">
                <Lock size={18} aria-hidden="true" />
                Caisse clôturée
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Espèces attendues</dt>
                  <dd className="tabular-nums">{formatFcfa(maCloture.montantTheorique)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Espèces comptées</dt>
                  <dd className="tabular-nums">{formatFcfa(maCloture.montantCompte)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <dt>Écart</dt>
                  <dd>
                    <Ecart valeur={maCloture.ecart} />
                  </dd>
                </div>
              </dl>
              {maCloture.commentaire && <p className="mt-3 text-xs text-ink-muted">« {maCloture.commentaire} »</p>}
            </div>
          ) : (
            <>
              <h2 className="mb-1 font-semibold">Clôturer ma caisse</h2>
              <p className="mb-4 text-sm text-ink-muted">
                Espèces attendues : <b className="text-ink">{formatFcfa(bilan.especes)}</b>
              </p>
              <ClosingForm especesAttendues={bilan.especes} />
            </>
          )}
        </aside>
      </div>

      {/* Direction : toutes les caisses du jour */}
      {estDirecteur && (
        <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface-200">
          <h2 className="border-b border-border px-5 py-4 font-semibold">Toutes les caisses du jour</h2>
          {caissesDuJour.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-muted">Aucun encaissement aujourd&apos;hui.</p>
          ) : (
            <ul className="divide-y divide-border">
              {caissesDuJour.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="min-w-40 flex-1 font-medium">{c.nom}</span>
                  <span className="tabular-nums text-ink-muted">Espèces {formatFcfa(c.bilan.especes)}</span>
                  <span className="tabular-nums text-ink-muted">Total {formatFcfa(c.bilan.total)}</span>
                  {c.cloture ? (
                    <span className="flex items-center gap-2">
                      <Lock size={14} className="text-success" aria-hidden="true" />
                      <Ecart valeur={c.cloture.ecart} />
                    </span>
                  ) : (
                    <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
                      Non clôturée
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Historique */}
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface-200">
        <h2 className="border-b border-border px-5 py-4 font-semibold">Clôtures des 30 derniers jours</h2>
        {historique.length === 0 ? (
          <p className="px-5 py-4 text-sm text-ink-muted">Aucune clôture pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-border">
            {historique.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="w-28 text-ink-muted">{formatDate(h.date)}</span>
                {estDirecteur && <span className="min-w-32 flex-1 font-medium">{h.caissier.utilisateur.nom}</span>}
                <span className="tabular-nums text-ink-muted">
                  {formatFcfa(h.montantCompte)} / {formatFcfa(h.montantTheorique)}
                </span>
                <Ecart valeur={h.ecart} />
                {h.commentaire && <span className="w-full text-xs text-ink-muted">« {h.commentaire} »</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
