import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa, formatNombre } from "@/lib/format";
import { dateDuJour } from "@/lib/echeancier";
import { LABEL_MODE, MODES_PAIEMENT, TON_MODE } from "@/lib/paiements";
import Badge from "@/components/ui/badge";

type PaymentsPageProps = {
  searchParams: Promise<{ jour?: string }>;
};

const formateurHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { jour } = await searchParams;

  const aujourdhui = dateDuJour().toISOString().slice(0, 10);
  const jourChoisi = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : aujourdhui;
  const debut = new Date(`${jourChoisi}T00:00:00.000Z`);
  const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000);

  const paiements = await db.paiement.findMany({
    where: { date: { gte: debut, lt: fin } },
    orderBy: { date: "desc" },
    include: {
      apprenant: { select: { prenom: true, nom: true } },
      caissier: { include: { utilisateur: { select: { nom: true } } } },
      annulation: { select: { id: true } },
    },
  });

  const valides = paiements.filter((p) => !p.annulation);
  const total = valides.reduce((s, p) => s + p.montant, 0);
  const parMode = MODES_PAIEMENT.map((m) => ({
    ...m,
    montant: valides.filter((p) => p.mode === m.valeur).reduce((s, p) => s + p.montant, 0),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Encaissements</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Journal de caisse du {formatDate(debut)}
            {jourChoisi === aujourdhui && " (aujourd'hui)"}
          </p>
        </div>
        <form action="/payments" className="flex items-center gap-2">
          <label htmlFor="jour" className="sr-only">
            Jour
          </label>
          <input
            id="jour"
            name="jour"
            type="date"
            defaultValue={jourChoisi}
            max={aujourdhui}
            className="h-11 rounded-md border border-border bg-surface-200 px-3 text-ink"
          />
          <button
            type="submit"
            className="h-11 cursor-pointer rounded-md border border-border bg-surface-200 px-4 font-medium hover:bg-surface-100"
          >
            Afficher
          </button>
        </form>
        <Link
          href="/payments/closing"
          className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
        >
          <Lock size={18} aria-hidden="true" />
          Clôture de caisse
        </Link>
        <Link
          href="/payments/new"
          className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-5 font-medium text-navy-900 hover:opacity-90"
        >
          <Plus size={18} aria-hidden="true" />
          Nouvel encaissement
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-navy-900 p-5 text-white sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-white/70">Total encaissé</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-2xl font-bold text-gold-500 tabular-nums">{formatNombre(total)}</span>{" "}
            <span className="text-sm text-white/70">FCFA</span>
          </p>
          <p className="mt-1 text-xs text-white/70">
            {valides.length} paiement{valides.length > 1 ? "s" : ""}
          </p>
        </div>
        {parMode.map((m) => (
          <div key={m.valeur} className="rounded-lg border border-border bg-surface-200 p-5">
            <p className="text-sm text-ink-muted">{m.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatNombre(m.montant)}</p>
          </div>
        ))}
      </div>

      {paiements.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">Aucun encaissement ce jour-là</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
          {paiements.map((p) => (
            <li key={p.id}>
              <Link
                href={`/payments/${p.id}`}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm text-ink hover:bg-gold-100/50 ${
                  p.annulation ? "opacity-60" : ""
                }`}
              >
                <span className="w-14 shrink-0 tabular-nums text-ink-muted">{formateurHeure.format(p.date)}</span>
                <span className="min-w-40 flex-1">
                  <span className="block font-semibold">
                    {p.apprenant.prenom} {p.apprenant.nom}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {p.numeroRecu} · {p.caissier?.utilisateur.nom ?? "En ligne"}
                  </span>
                </span>
                <Badge ton={TON_MODE[p.mode]}>{LABEL_MODE[p.mode]}</Badge>
                <span className={`w-28 text-right font-semibold tabular-nums ${p.annulation ? "line-through" : ""}`}>
                  {formatFcfa(p.montant)}
                </span>
                {p.annulation && <Badge ton="danger">Annulé</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
