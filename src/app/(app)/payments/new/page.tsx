import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa } from "@/lib/format";
import { resumeFinancier } from "@/lib/echeancier";
import PaymentForm, { type EcheancePayable } from "./payment-form";

type NewPaymentPageProps = {
  searchParams: Promise<{ q?: string; apprenant?: string }>;
};

const INSCRIPTIONS_EN_COURS = { statut: { in: ["ACTIVE" as const, "TERMINEE" as const] } };

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { q = "", apprenant: apprenantId } = await searchParams;

  // ─── Étape 2 : l'apprenant est choisi ───
  if (apprenantId) {
    const apprenant = await db.apprenant.findFirst({
      where: { id: apprenantId },
      include: {
        inscriptions: {
          where: INSCRIPTIONS_EN_COURS,
          include: {
            session: { select: { formation: { select: { intitule: true } } } },
            echeances: { where: { statut: { not: "ANNULEE" } } },
          },
        },
      },
    });
    if (!apprenant) {
      notFound();
    }

    const echeances: EcheancePayable[] = apprenant.inscriptions
      .flatMap((i) =>
        i.echeances.map((e) => ({
          id: e.id,
          libelle: e.libelle,
          formation: i.session.formation.intitule,
          dateLimite: e.dateLimite.toISOString(),
          ordre: e.ordre,
          reste: e.montantDu - e.montantPaye,
        })),
      )
      .filter((e) => e.reste > 0)
      .sort((a, b) => a.dateLimite.localeCompare(b.dateLimite) || a.ordre - b.ordre);

    const resume = resumeFinancier(apprenant.inscriptions.flatMap((i) => i.echeances));

    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/payments/new"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Changer d&apos;apprenant
        </Link>
        <h1 className="mt-3 mb-6 text-2xl font-semibold lg:text-3xl">Nouvel encaissement</h1>

        <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface-200 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
            {`${apprenant.prenom[0] ?? ""}${apprenant.nom[0] ?? ""}`.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {apprenant.prenom} {apprenant.nom}
            </p>
            <p className="truncate text-sm text-ink-muted">
              Reste {formatFcfa(resume.reste)} sur {formatFcfa(resume.total)}
            </p>
          </div>
          <Link href={`/students/${apprenant.id}`} className="text-sm font-semibold">
            Fiche
          </Link>
        </div>

        {echeances.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center">
            <p className="font-semibold">Rien à encaisser</p>
            <p className="mt-1 text-sm text-ink-muted">Cet apprenant est à jour de tous ses paiements.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface-200 p-5 shadow-[var(--shadow-card)] lg:p-6">
            <PaymentForm
              apprenantId={apprenant.id}
              echeances={echeances}
              enRetard={resume.enRetard}
              caissier={membre.utilisateur.nom}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Étape 1 : trouver l'apprenant ───
  const recherche = q.trim();
  const apprenants = await db.apprenant.findMany({
    where: recherche
      ? {
          OR: [
            { nom: { contains: recherche, mode: "insensitive" } },
            { prenom: { contains: recherche, mode: "insensitive" } },
            { telephone: { contains: recherche } },
          ],
        }
      : { inscriptions: { some: { statut: "ACTIVE" } } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    take: 30,
    include: {
      inscriptions: {
        where: INSCRIPTIONS_EN_COURS,
        include: {
          session: { select: { formation: { select: { intitule: true } } } },
          echeances: { select: { montantDu: true, montantPaye: true, dateLimite: true, statut: true } },
        },
      },
    },
  });

  const resultats = apprenants
    .map((a) => ({
      id: a.id,
      nom: `${a.prenom} ${a.nom}`,
      initiales: `${a.prenom[0] ?? ""}${a.nom[0] ?? ""}`.toUpperCase(),
      formation: a.inscriptions[0]?.session.formation.intitule ?? a.telephone,
      resume: resumeFinancier(a.inscriptions.flatMap((i) => i.echeances)),
    }))
    .filter((r) => recherche || r.resume.reste > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Nouvel encaissement</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">Étape 1 sur 2 · trouvez l&apos;apprenant</p>

      <form action="/payments/new">
        <label className="flex h-12 items-center gap-2 rounded-md border border-border bg-surface-200 px-3 text-ink-muted focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-100">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={recherche}
            autoFocus
            placeholder="Nom ou téléphone de l'apprenant"
            aria-label="Rechercher un apprenant"
            className="h-full flex-1 bg-transparent text-ink outline-none"
          />
        </label>
      </form>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {recherche
          ? `${resultats.length} résultat${resultats.length > 1 ? "s" : ""}`
          : "Apprenants avec un reste à payer"}
      </p>

      {resultats.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
          {recherche ? "Aucun apprenant trouvé." : "Aucun apprenant n'a de reste à payer."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
          {resultats.map((r) => (
            <li key={r.id}>
              <Link
                href={`/payments/new?apprenant=${r.id}`}
                className="flex items-center gap-3 px-4 py-3 text-ink hover:bg-gold-100/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
                  {r.initiales}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.nom}</span>
                  <span className="block truncate text-xs text-ink-muted">{r.formation}</span>
                </span>
                <span className="text-right">
                  <span className="block text-xs text-ink-muted">Reste</span>
                  <span className={`font-semibold tabular-nums ${r.resume.enRetard > 0 ? "text-danger" : ""}`}>
                    {formatFcfa(r.resume.reste)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
