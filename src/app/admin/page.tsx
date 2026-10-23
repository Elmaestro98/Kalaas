import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatDate, formatNombre } from "@/lib/format";
import { exigerSuperAdmin } from "@/lib/tenant";
import { TYPES_ETABLISSEMENT } from "@/lib/etablissement";
import { PERIODES_PLATEFORME, chargerTableauPlateforme, type PeriodePlateforme } from "@/lib/plateforme";
import Badge, { type TonBadge } from "@/components/ui/badge";
import { Barres, Colonnes, Courbe } from "./charts";

type AdminPageProps = {
  searchParams: Promise<{ periode?: string }>;
};

const STATUTS: Record<string, { label: string; ton: TonBadge }> = {
  ESSAI: { label: "Essai", ton: "info" },
  ACTIF: { label: "Actif", ton: "success" },
  EXPIRE: { label: "Expiré", ton: "danger" },
  ANNULE: { label: "Annulé", ton: "neutral" },
  AUCUN: { label: "Sans abonnement", ton: "warning" },
};

const OFFRES: Record<string, string> = { ESSENTIEL: "Essentiel", PRO: "Pro", PREMIUM: "Premium", CAMPUS: "Campus" };

// « aujourd'hui », « hier », « il y a 5 j », sinon la date
function depuis(date: Date | null) {
  if (!date) return "Jamais";
  const jours = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours < 30) return `Il y a ${jours} j`;
  return formatDate(date);
}

function Carte({ titre, aide, children, className = "" }: { titre: string; aide?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-surface-200 p-5 ${className}`}>
      <h2 className="font-semibold">{titre}</h2>
      {aide && <p className="mt-0.5 text-xs text-ink-muted">{aide}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chiffre({ label, valeur, detail }: { label: string; valeur: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-200 p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  // Vérifié ici aussi : la mise en page et la page sont calculées en parallèle, le contrôle du layout ne suffit pas
  await exigerSuperAdmin();
  const { periode: demandee } = await searchParams;
  const periode: PeriodePlateforme = demandee && demandee in PERIODES_PLATEFORME ? (demandee as PeriodePlateforme) : "30j";
  const t = await chargerTableauPlateforme(periode);
  const { chiffres } = t;
  const sur = PERIODES_PLATEFORME[periode].label.toLowerCase();
  const suiviVide = t.series.utilisateursActifs.every((p) => p.valeur === 0);

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Activité de la plateforme</h1>
      <p className="mt-1 text-ink-muted">Tous les établissements clients de Kalaas, depuis le {formatDate(t.debut)}.</p>

      {/* Filtre de période : il s'applique à tous les chiffres et graphiques de la page */}
      <nav aria-label="Période" className="mt-5 inline-flex flex-wrap gap-1 rounded-md border border-border bg-surface-200 p-1">
        {(Object.keys(PERIODES_PLATEFORME) as PeriodePlateforme[]).map((p) => (
          <Link
            key={p}
            href={`/admin?periode=${p}`}
            aria-current={p === periode ? "page" : undefined}
            className={`flex h-9 items-center rounded-sm px-4 text-sm ${
              p === periode ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {PERIODES_PLATEFORME[p].label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Encaissé par les établissements</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-3xl font-bold text-gold-500">{formatNombre(chiffres.encaisse)}</span>{" "}
            <span className="text-sm text-white/70">FCFA</span>
          </p>
          <p className="mt-1 text-xs text-white/70">{sur}, hors paiements annulés</p>
        </div>
        <Chiffre
          label="Établissements actifs"
          valeur={`${chiffres.etablissementsActifs} / ${chiffres.etablissements}`}
          detail={`${chiffres.nouveauxEtablissements} nouveau${chiffres.nouveauxEtablissements > 1 ? "x" : ""} sur la période`}
        />
        <Chiffre
          label="Utilisateurs actifs"
          valeur={formatNombre(chiffres.utilisateursActifs)}
          detail={`dont ${chiffres.actifsAujourdhui} aujourd'hui`}
        />
        <Chiffre
          label="Inscriptions"
          valeur={formatNombre(chiffres.inscriptions)}
          detail={`${formatNombre(chiffres.elevesActifs)} inscrits actifs au total`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Utilisateurs actifs" aide="Personnes ayant utilisé Kalaas, par intervalle">
          {suiviVide ? (
            <p className="rounded-md bg-surface-100 p-6 text-center text-sm text-ink-muted">
              Le suivi des connexions vient de démarrer : la courbe se remplira au fil des visites de vos clients.
            </p>
          ) : (
            <Courbe points={t.series.utilisateursActifs} pas={t.pas} titre="Utilisateurs actifs" unite="utilisateurs" />
          )}
        </Carte>
        <Carte titre="Fonctions utilisées" aide={`Nombre d'actions ${sur}, tous établissements confondus`}>
          <Barres elements={t.modules} titre="Fonctions utilisées" />
        </Carte>
        <Carte titre="Encaissements" aide="Montants encaissés par les établissements (FCFA)">
          <Colonnes points={t.series.encaissements} pas={t.pas} titre="Encaissements" unite="FCFA" />
        </Carte>
        <Carte titre="Inscriptions" aide="Nouvelles inscriptions et réinscriptions">
          <Colonnes points={t.series.inscriptions} pas={t.pas} titre="Inscriptions" unite="inscriptions" />
        </Carte>
      </div>

      <Carte titre="Abonnements" className="mt-4">
        <ul className="flex flex-wrap gap-3">
          {Object.entries(t.statutsAbonnement).map(([statut, nombre]) => (
            <li key={statut} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Badge ton={STATUTS[statut].ton}>{STATUTS[statut].label}</Badge>
              <span className="text-lg font-bold">{nombre}</span>
            </li>
          ))}
        </ul>
        {t.essaisBientotFinis.length > 0 && (
          <div className="mt-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} aria-hidden="true" />
              {t.essaisBientotFinis.length} essai{t.essaisBientotFinis.length > 1 ? "s se terminent" : " se termine"} dans
              les 7 jours : à relancer
            </p>
            <ul className="mt-1 space-y-0.5">
              {t.essaisBientotFinis.map((e) => (
                <li key={e.id}>
                  {e.nom} · fin le {formatDate(e.abonnement!.fin)}
                  {e.directeur && ` · ${e.directeur.nom} (${e.directeur.email})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Carte>

      <Carte titre="Établissements" aide={`Les plus actifs en premier · chiffres ${sur}`} className="mt-4">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="bg-surface-100 text-left text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2 font-semibold">Établissement</th>
                <th scope="col" className="px-3 py-2 font-semibold">Directeur</th>
                <th scope="col" className="px-3 py-2 font-semibold">Abonnement</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Membres</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Inscrits</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Actifs</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Actions</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Encaissé</th>
                <th scope="col" className="px-5 py-2 font-semibold">Dernière activité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {t.etablissements.map((e) => {
                const statut = STATUTS[e.abonnement?.statut ?? "AUCUN"];
                return (
                  <tr key={e.id}>
                    <th scope="row" className="px-5 py-3 text-left font-medium">
                      {e.nom}
                      {e.suspendu && (
                        <span className="ml-2">
                          <Badge ton="danger">Suspendu</Badge>
                        </span>
                      )}
                      <span className="block text-xs font-normal text-ink-muted">
                        {TYPES_ETABLISSEMENT[e.type as keyof typeof TYPES_ETABLISSEMENT].label}
                        {e.ville && ` · ${e.ville}`} · depuis le {formatDate(e.creeLe)}
                      </span>
                    </th>
                    <td className="px-3 py-3">
                      {e.directeur ? (
                        <>
                          {e.directeur.nom}
                          <span className="block text-xs text-ink-muted">{e.directeur.email}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge ton={statut.ton}>{statut.label}</Badge>
                      {e.abonnement && (
                        <span className="block text-xs text-ink-muted">
                          {OFFRES[e.abonnement.offre]} · fin le {formatDate(e.abonnement.fin)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{e.membres}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatNombre(e.eleves)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{e.utilisateursActifs}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatNombre(e.actions)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{formatNombre(e.encaisse)} FCFA</td>
                    <td className={`px-5 py-3 whitespace-nowrap ${e.derniereActivite ? "" : "text-ink-muted"}`}>
                      {depuis(e.derniereActivite)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  );
}
