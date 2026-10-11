import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa } from "@/lib/format";
import { lireMois } from "@/lib/heures-donnees";
import { CATEGORIES_DEPENSE, LABEL_CATEGORIE } from "@/lib/depenses";
import { LABEL_MODE, TON_MODE } from "@/lib/paiements";
import Badge from "@/components/ui/badge";
import CancelExpense from "./cancel-expense";

type ExpensesPageProps = {
  searchParams: Promise<{ mois?: string; nouveau?: string }>;
};

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function cleMois(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";
  const { mois, nouveau } = await searchParams;
  const { debut, fin } = lireMois(mois);

  const depenses = await db.depense.findMany({
    where: { date: { gte: debut, lt: fin } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      saisiePar: { include: { utilisateur: { select: { nom: true } } } },
      annuleePar: { include: { utilisateur: { select: { nom: true } } } },
    },
  });

  const valides = depenses.filter((d) => !d.annuleeLe);
  const total = valides.reduce((s, d) => s + d.montant, 0);
  const parCategorie = CATEGORIES_DEPENSE.map((c) => ({
    ...c,
    montant: valides.filter((d) => d.categorie === c.valeur).reduce((s, d) => s + d.montant, 0),
  })).filter((c) => c.montant > 0);

  const precedent = cleMois(new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() - 1, 1)));
  const suivant = cleMois(fin);

  return (
    <div className="mx-auto max-w-5xl">
      {nouveau && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-success-soft p-4 text-success">
          <CheckCircle2 size={24} aria-hidden="true" />
          <p className="font-semibold">Dépense enregistrée</p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Dépenses</h1>
          <p className="mt-1 text-sm text-ink-muted">Tout ce qui sort de la caisse, hors paie des vacataires.</p>
        </div>
        <Link
          href="/expenses/new"
          className="flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
        >
          <Plus size={18} aria-hidden="true" />
          Nouvelle dépense
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/expenses?mois=${precedent}`}
          aria-label="Mois précédent"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <p className="flex-1 text-center font-semibold capitalize">{formateurMois.format(debut)}</p>
        <Link
          href={`/expenses?mois=${suivant}`}
          aria-label="Mois suivant"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Total des dépenses</p>
          <p className="mt-1 text-3xl font-bold text-gold-500 tabular-nums">{formatFcfa(total)}</p>
          <p className="mt-1 text-xs text-white/70">
            {valides.length} dépense{valides.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5 lg:col-span-2">
          <p className="text-sm text-ink-muted">Par catégorie</p>
          {parCategorie.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Aucune dépense ce mois-ci.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {parCategorie.map((c) => (
                <li key={c.valeur} className="flex justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="font-semibold tabular-nums">{formatFcfa(c.montant)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {depenses.length > 0 && (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
          {depenses.map((d) => (
            <li key={d.id} className={`px-4 py-3 ${d.annuleeLe ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="w-24 text-sm text-ink-muted tabular-nums">{formatDate(d.date)}</span>
                <span className="min-w-44 flex-1">
                  <span className={`block font-medium ${d.annuleeLe ? "line-through" : ""}`}>{d.description}</span>
                  <span className="text-xs text-ink-muted">
                    {LABEL_CATEGORIE[d.categorie]} · saisie par {d.saisiePar.utilisateur.nom}
                    {d.reference && <> · réf. {d.reference}</>}
                  </span>
                </span>
                <Badge ton={TON_MODE[d.mode]}>{LABEL_MODE[d.mode]}</Badge>
                <span className="w-32 text-right font-bold tabular-nums">{formatFcfa(d.montant)}</span>
                {estDirecteur && !d.annuleeLe && <CancelExpense depenseId={d.id} />}
              </div>
              {d.annuleeLe && (
                <p className="mt-1 text-xs text-danger">
                  Annulée le {formatDate(d.annuleeLe)}
                  {d.annuleePar && <> par {d.annuleePar.utilisateur.nom}</>} · {d.motifAnnulation}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Une dépense n&apos;est jamais supprimée : en cas d&apos;erreur, le directeur l&apos;annule avec un motif.
      </p>
    </div>
  );
}
