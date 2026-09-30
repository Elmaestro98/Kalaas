import Link from "next/link";
import { Search, Wallet } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa, formatNombre } from "@/lib/format";
import { lienWhatsApp } from "@/lib/telephone";
import {
  DECLENCHEURS,
  TRANCHES,
  VARIABLES,
  trancheDeRetard,
  type Tranche,
} from "@/lib/relances";
import {
  chargerImpayes,
  chargerModeles,
  chargerRelancesDuJour,
  messagePourDossier,
  messagePourRelance,
} from "@/lib/impayes-donnees";
import RelanceButton from "./relance-button";
import TemplateForm from "./template-form";

type UnpaidPageProps = {
  searchParams: Promise<{ onglet?: string; tranche?: string; q?: string }>;
};

type Onglet = "retards" | "jour" | "modeles";

function lienWa(telephone: string, message: string) {
  return `${lienWhatsApp(telephone)}?text=${encodeURIComponent(message)}`;
}

function couleurRetard(jours: number) {
  if (jours > 30) return "bg-danger text-white";
  if (jours > 7) return "bg-danger-soft text-danger";
  return "bg-warning-soft text-warning";
}

export default async function UnpaidPage({ searchParams }: UnpaidPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";
  const params = await searchParams;

  const onglet: Onglet =
    params.onglet === "jour" ? "jour" : params.onglet === "modeles" && estDirecteur ? "modeles" : "retards";
  const tranche: Tranche = TRANCHES.some((t) => t.valeur === params.tranche)
    ? (params.tranche as Tranche)
    : "TOUS";
  const recherche = (params.q ?? "").trim().toLowerCase();

  const [dossiers, duJour, modeles] = await Promise.all([
    chargerImpayes(db),
    chargerRelancesDuJour(db),
    chargerModeles(db),
  ]);

  const totalRetard = dossiers.reduce((s, d) => s + d.montant, 0);
  const plusDe30 = dossiers.filter((d) => d.joursMax > 30).length;

  const affiches = dossiers.filter((d) => {
    if (tranche !== "TOUS" && trancheDeRetard(d.joursMax) !== tranche) return false;
    if (!recherche) return true;
    const texte = `${d.apprenant.prenom} ${d.apprenant.nom} ${d.apprenant.matricule ?? ""} ${d.apprenant.telephone}`;
    return texte.toLowerCase().includes(recherche);
  });

  const compteParTranche = (t: Tranche) =>
    t === "TOUS" ? dossiers.length : dossiers.filter((d) => trancheDeRetard(d.joursMax) === t).length;

  const lienTranche = (t: Tranche) => {
    const p = new URLSearchParams();
    if (t !== "TOUS") p.set("tranche", t);
    if (recherche) p.set("q", recherche);
    const s = p.toString();
    return s ? `/unpaid?${s}` : "/unpaid";
  };

  const onglets: { valeur: Onglet; label: string; href: string; badge?: number }[] = [
    { valeur: "retards", label: "En retard", href: "/unpaid", badge: dossiers.length },
    { valeur: "jour", label: "À relancer aujourd'hui", href: "/unpaid?onglet=jour", badge: duJour.length },
    ...(estDirecteur ? [{ valeur: "modeles" as const, label: "Modèles de messages", href: "/unpaid?onglet=modeles" }] : []),
  ];

  const exemple = {
    prenom: "Awa",
    nom: "Diop",
    montant: "30 000 FCFA",
    echeance: "Mensualité 2/6",
    echeances: "Mensualité 1/6, Mensualité 2/6",
    date: "5 nov. 2026",
    jours: "12",
    formation: "Licence Informatique — L1",
    etablissement: institut.nom,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Impayés et relances</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Un clic ouvre WhatsApp avec le message prêt ; chaque relance est enregistrée dans l&apos;historique.
      </p>

      {/* Indicateurs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Montant en retard</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-3xl font-bold text-gold-500 tabular-nums">{formatNombre(totalRetard)}</span>{" "}
            <span className="text-sm text-white/70">FCFA</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Apprenants en retard</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{dossiers.length}</p>
          <p className="mt-1 text-xs text-ink-muted">dont {plusDe30} depuis plus de 30 jours</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">À relancer aujourd&apos;hui</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{duJour.length}</p>
          <p className="mt-1 text-xs text-ink-muted">rappels J-3, J+1 et J+7</p>
        </div>
      </div>

      {/* Onglets */}
      <nav aria-label="Sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {onglets.map((o) => (
          <Link
            key={o.valeur}
            href={o.href}
            aria-current={onglet === o.valeur ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${
              onglet === o.valeur
                ? "border-gold-500 font-semibold text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {o.label}
            {o.badge !== undefined && o.badge > 0 && (
              <span className="rounded-full bg-surface-100 px-1.5 text-xs tabular-nums">{o.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* ─── En retard ─── */}
      {onglet === "retards" && (
        <section className="mt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface-200 p-1">
              {TRANCHES.map((t) => (
                <Link
                  key={t.valeur}
                  href={lienTranche(t.valeur)}
                  aria-current={tranche === t.valeur ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-sm ${
                    tranche === t.valeur ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span className="text-xs opacity-70">{compteParTranche(t.valeur)}</span>
                </Link>
              ))}
            </div>
            <form action="/unpaid" className="flex-1 lg:ml-auto lg:max-w-xs">
              {tranche !== "TOUS" && <input type="hidden" name="tranche" value={tranche} />}
              <label className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-3 text-ink-muted focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-100">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Nom, matricule, téléphone"
                  aria-label="Rechercher"
                  className="h-full flex-1 bg-transparent text-ink outline-none"
                />
              </label>
            </form>
          </div>

          {affiches.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
              <p className="font-semibold">
                {dossiers.length === 0 ? "Aucun impayé, bravo !" : "Aucun apprenant dans ce filtre"}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {dossiers.length === 0
                  ? "Tous les apprenants sont à jour de leurs paiements."
                  : "Essayez une autre tranche ou une autre recherche."}
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {affiches.map((d) => {
                const message = messagePourDossier(modeles.MANUELLE, d, institut.nom);
                const ids = d.echeances.map((e) => e.id);
                return (
                  <li
                    key={d.apprenant.id}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-surface-200 p-4 lg:flex-row lg:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/students/${d.apprenant.id}`} className="font-semibold text-ink hover:underline">
                          {d.apprenant.prenom} {d.apprenant.nom}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${couleurRetard(d.joursMax)}`}>
                          {d.joursMax} j de retard
                        </span>
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        {d.apprenant.matricule && <span className="font-mono">{d.apprenant.matricule} · </span>}
                        {d.apprenant.telephone} · {d.formation}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {d.echeances.map((e) => `${e.libelle} (${formatDate(e.dateLimite)})`).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {d.derniereRelance
                          ? `Dernière relance le ${formatDate(d.derniereRelance)}`
                          : "Jamais relancé"}
                      </p>
                    </div>

                    <p className="shrink-0 text-lg font-bold tabular-nums lg:w-36 lg:text-right">
                      {formatFcfa(d.montant)}
                    </p>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <RelanceButton
                        href={lienWa(d.apprenant.telephone, message)}
                        label="WhatsApp"
                        apprenantId={d.apprenant.id}
                        declencheur="MANUELLE"
                        echeanceIds={ids}
                        message={message}
                      />
                      {d.apprenant.tuteurTelephone && (
                        <RelanceButton
                          href={lienWa(d.apprenant.tuteurTelephone, message)}
                          label="Tuteur"
                          apprenantId={d.apprenant.id}
                          declencheur="MANUELLE"
                          echeanceIds={ids}
                          message={message}
                          variante="secondaire"
                        />
                      )}
                      <Link
                        href={`/payments/new?apprenant=${d.apprenant.id}`}
                        className="flex h-10 items-center gap-2 rounded-md bg-gold-500 px-3 text-sm font-medium text-navy-900 hover:opacity-90"
                      >
                        <Wallet size={16} aria-hidden="true" />
                        Encaisser
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ─── À relancer aujourd'hui ─── */}
      {onglet === "jour" && (
        <section className="mt-5 space-y-6">
          {duJour.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
              <p className="font-semibold">Aucune relance prévue aujourd&apos;hui</p>
              <p className="mt-1 text-sm text-ink-muted">
                Kalaas propose chaque jour les rappels 3 jours avant l&apos;échéance, le lendemain et 7 jours
                après.
              </p>
            </div>
          ) : (
            DECLENCHEURS.filter((dcl) => dcl.valeur !== "MANUELLE").map((dcl) => {
              const liste = duJour.filter((r) => r.declencheur === dcl.valeur);
              if (liste.length === 0) return null;
              return (
                <div key={dcl.valeur}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
                    {dcl.label} · {liste.length}
                  </h2>
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
                    {liste.map((r) => {
                      const message = messagePourRelance(modeles[r.declencheur], r, institut.nom);
                      return (
                        <li key={r.echeance.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                          <div className="min-w-44 flex-1">
                            <Link href={`/students/${r.apprenant.id}`} className="font-semibold text-ink hover:underline">
                              {r.apprenant.prenom} {r.apprenant.nom}
                            </Link>
                            <p className="text-xs text-ink-muted">
                              {r.echeance.libelle} · échéance le {formatDate(r.echeance.dateLimite)} · {r.formation}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums">{formatFcfa(r.echeance.reste)}</span>
                          <RelanceButton
                            href={lienWa(r.apprenant.telephone, message)}
                            label="Envoyer"
                            apprenantId={r.apprenant.id}
                            declencheur={r.declencheur}
                            echeanceIds={[r.echeance.id]}
                            message={message}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* ─── Modèles ─── */}
      {onglet === "modeles" && estDirecteur && (
        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
          <div className="space-y-4">
            {DECLENCHEURS.map((dcl) => (
              <TemplateForm
                key={dcl.valeur}
                declencheur={dcl.valeur}
                label={dcl.label}
                description={dcl.description}
                contenu={modeles[dcl.valeur]}
                exemple={exemple}
              />
            ))}
          </div>
          <aside className="rounded-lg border border-border bg-surface-200 p-5 text-sm lg:sticky lg:top-24">
            <h2 className="font-semibold">Variables disponibles</h2>
            <p className="mt-1 text-xs text-ink-muted">Elles sont remplacées automatiquement dans chaque message.</p>
            <dl className="mt-3 space-y-2">
              {VARIABLES.map((v) => (
                <div key={v.cle}>
                  <dt className="font-mono text-xs font-semibold text-gold-700">{`{${v.cle}}`}</dt>
                  <dd className="text-xs text-ink-muted">{v.description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      )}
    </div>
  );
}
