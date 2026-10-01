import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, MessageCircle, RefreshCw, Wallet } from "lucide-react";
import { TYPE_INSCRIPTION } from "@/lib/lmd";
import { DECLENCHEURS, type Declencheur } from "@/lib/relances";
import { classeTaux, compter, tauxAssiduite } from "@/lib/presences";

const LABEL_DECLENCHEUR = Object.fromEntries(DECLENCHEURS.map((d) => [d.valeur, d.label])) as Record<
  Declencheur,
  string
>;
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa, formatNombre } from "@/lib/format";
import { lienWhatsApp } from "@/lib/telephone";
import {
  ETAT_ECHEANCE,
  STATUT_FINANCIER,
  etatEcheance,
  resumeFinancier,
  statutFinancier,
} from "@/lib/echeancier";
import Badge from "@/components/ui/badge";

type StudentPageProps = {
  params: Promise<{ id: string }>;
};

const STATUT_INSCRIPTION = {
  ACTIVE: { label: "Active", ton: "success" },
  ABANDON: { label: "Abandon", ton: "danger" },
  TERMINEE: { label: "Terminée", ton: "neutral" },
  TRANSFEREE: { label: "Transférée", ton: "info" },
} as const;

export default async function StudentPage({ params }: StudentPageProps) {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;

  const apprenant = await db.apprenant.findFirst({
    where: { id },
    include: {
      inscriptions: {
        orderBy: { date: "desc" },
        include: {
          session: {
            include: {
              formation: { select: { intitule: true } },
              anneeAcademique: { select: { libelle: true } },
            },
          },
          echeances: { orderBy: { ordre: "asc" } },
          _count: { select: { notes: true } },
        },
      },
    },
  });
  if (!apprenant) {
    notFound();
  }

  const echeancesEnCours = apprenant.inscriptions
    .filter((i) => i.statut === "ACTIVE" || i.statut === "TERMINEE")
    .flatMap((i) => i.echeances);
  const resume = resumeFinancier(echeancesEnCours);

  // Assiduité sur toutes ses classes
  const presences = await db.presence.findMany({
    where: { inscription: { apprenantId: apprenant.id } },
    select: { statut: true },
  });
  const compteursPresence = compter(presences.map((p) => p.statut));
  const assiduite = tauxAssiduite(compteursPresence);

  // Historique des relances : une relance groupée (plusieurs échéances) = une seule ligne
  const lignesRelance = await db.relance.findMany({
    where: { statut: "ENVOYEE", echeance: { inscription: { apprenantId: apprenant.id } } },
    orderBy: { envoyeeLe: "desc" },
    take: 30,
    include: { auteur: { select: { utilisateur: { select: { nom: true } } } } },
  });
  const relances = [
    ...lignesRelance
      .reduce((groupes, r) => {
        const cle = `${r.envoyeeLe?.toISOString()}-${r.declencheur}`;
        const groupe = groupes.get(cle);
        if (groupe) {
          groupe.nbEcheances += 1;
        } else {
          groupes.set(cle, {
            cle,
            declencheur: r.declencheur,
            date: r.envoyeeLe,
            auteur: r.auteur?.utilisateur.nom ?? null,
            nbEcheances: 1,
          });
        }
        return groupes;
      }, new Map<string, { cle: string; declencheur: Declencheur; date: Date | null; auteur: string | null; nbEcheances: number }>())
      .values(),
  ].slice(0, 5);
  const statut = statutFinancier(resume);
  const pourcentage = resume.total > 0 ? Math.round((resume.paye / resume.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Apprenants
      </Link>

      {/* Identité et actions */}
      <section className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface-200 p-5 lg:flex-row lg:items-center lg:p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-gold-500">
          {`${apprenant.prenom[0] ?? ""}${apprenant.nom[0] ?? ""}`.toUpperCase()}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {apprenant.prenom} {apprenant.nom}
            </h1>
            <Badge ton={STATUT_FINANCIER[statut].ton}>{STATUT_FINANCIER[statut].label}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {apprenant.matricule && <span className="font-mono font-medium text-ink">{apprenant.matricule} · </span>}
            {apprenant.telephone}
            {apprenant.inscriptions[0] && <> · {apprenant.inscriptions[0].session.formation.intitule}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={lienWhatsApp(apprenant.telephone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium text-ink hover:bg-surface-100"
          >
            <MessageCircle size={18} aria-hidden="true" />
            WhatsApp
          </a>
          <Link
            href={`/enrollments/new?apprenant=${apprenant.id}`}
            className="flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium text-ink hover:bg-surface-100"
          >
            <RefreshCw size={18} aria-hidden="true" />
            Réinscrire
          </Link>
          <Link
            href={`/payments/new?apprenant=${apprenant.id}`}
            className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-5 font-medium text-navy-900 hover:opacity-90"
          >
            <Wallet size={18} aria-hidden="true" />
            Encaisser un paiement
          </Link>
        </div>
      </section>

      {/* Résumé financier */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Payé</p>
          <p className="mt-1 whitespace-nowrap">
            <span className="text-2xl font-bold text-gold-500 tabular-nums">{formatNombre(resume.paye)}</span>
            <span className="text-sm text-white/70"> / {formatNombre(resume.total)} FCFA</span>
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-navy-700">
            <div className="h-1.5 rounded-full bg-gold-500" style={{ width: `${pourcentage}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/70">{pourcentage} % réglé</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Reste à payer</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatFcfa(resume.reste)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Dont en retard</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${resume.enRetard > 0 ? "text-danger" : ""}`}>
            {formatFcfa(resume.enRetard)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Prochaine échéance</p>
          {resume.prochaine ? (
            <>
              <p className="mt-1 text-lg font-semibold">{formatDate(resume.prochaine.date)}</p>
              <p className="text-sm text-ink-muted tabular-nums">{formatFcfa(resume.prochaine.montant)}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-ink-muted">Aucune</p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* Échéanciers */}
        <div className="space-y-6">
          {apprenant.inscriptions.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
              Aucune inscription.
            </p>
          )}

          {apprenant.inscriptions.map((inscription) => (
            <section key={inscription.id} className="overflow-hidden rounded-lg border border-border bg-surface-200">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex-1">
                  <h2 className="font-semibold">{inscription.session.formation.intitule}</h2>
                  <p className="text-sm text-ink-muted">
                    {inscription.session.anneeAcademique && <>{inscription.session.anneeAcademique.libelle} · </>}
                    {inscription.session.nom} · inscrit le {formatDate(inscription.date)}
                  </p>
                </div>
                {inscription.type !== "NOUVELLE" && (
                  <Badge ton={TYPE_INSCRIPTION[inscription.type].ton}>
                    {TYPE_INSCRIPTION[inscription.type].label}
                  </Badge>
                )}
                <Badge ton={STATUT_INSCRIPTION[inscription.statut].ton}>
                  {STATUT_INSCRIPTION[inscription.statut].label}
                </Badge>
                {inscription._count.notes > 0 && (
                  <a
                    href={`/grades/transcript?session=${inscription.sessionId}&inscription=${inscription.id}`}
                    download
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-surface-100"
                  >
                    <FileDown size={16} aria-hidden="true" />
                    Relevé de notes
                  </a>
                )}
              </div>

              {inscription.remiseType && (
                <p className="border-b border-border bg-success-soft px-5 py-2 text-sm text-success">
                  Remise{" "}
                  {inscription.remiseType === "POURCENTAGE"
                    ? `de ${inscription.remiseValeur} %`
                    : `de ${formatFcfa(inscription.remiseValeur)}`}
                  {inscription.motifRemise && <> · {inscription.motifRemise}</>}
                </p>
              )}

              <ul className="divide-y divide-border">
                {inscription.echeances.map((e) => {
                  const etat = etatEcheance(e);
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                      <div className="min-w-40 flex-1">
                        <p className="font-medium">{e.libelle}</p>
                        <p className="text-xs text-ink-muted">Échéance le {formatDate(e.dateLimite)}</p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="font-semibold">{formatFcfa(e.montantDu)}</p>
                        {e.montantPaye > 0 && e.montantPaye < e.montantDu && (
                          <p className="text-xs text-ink-muted">payé {formatFcfa(e.montantPaye)}</p>
                        )}
                      </div>
                      <div className="w-24 text-right">
                        <Badge ton={ETAT_ECHEANCE[etat].ton}>{ETAT_ECHEANCE[etat].label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* Dossier */}
        <aside className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Dossier</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Matricule</dt>
              <dd className="font-mono font-medium">{apprenant.matricule ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Téléphone</dt>
              <dd className="font-medium">{apprenant.telephone}</dd>
            </div>
            {apprenant.email && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">E-mail</dt>
                <dd className="truncate font-medium">{apprenant.email}</dd>
              </div>
            )}
            {(apprenant.dateNaissance || apprenant.lieuNaissance) && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Naissance</dt>
                <dd className="text-right font-medium">
                  {apprenant.dateNaissance && formatDate(apprenant.dateNaissance)}
                  {apprenant.dateNaissance && apprenant.lieuNaissance && " · "}
                  {apprenant.lieuNaissance}
                </dd>
              </div>
            )}
            {apprenant.sexe && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sexe</dt>
                <dd className="font-medium">{apprenant.sexe === "F" ? "Féminin" : "Masculin"}</dd>
              </div>
            )}
            {apprenant.diplomeAcces && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Diplôme d&apos;accès</dt>
                <dd className="font-medium">{apprenant.diplomeAcces}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Pièce d&apos;identité</dt>
              <dd className="font-medium">{apprenant.pieceIdentite ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Fiche créée le</dt>
              <dd className="font-medium">{formatDate(apprenant.createdAt)}</dd>
            </div>
          </dl>

          {apprenant.tuteurNom && (
            <div className="mt-4 rounded-md bg-surface-100 p-3 text-sm">
              <p className="text-xs text-ink-muted">Tuteur ou garant</p>
              <p className="font-medium">{apprenant.tuteurNom}</p>
              {apprenant.tuteurTelephone && (
                <a
                  href={lienWhatsApp(apprenant.tuteurTelephone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium"
                >
                  {apprenant.tuteurTelephone}
                </a>
              )}
            </div>
          )}

          <h2 className="mt-6 font-semibold">Assiduité</h2>
          {assiduite === null ? (
            <p className="mt-2 text-sm text-ink-muted">Aucun appel enregistré pour l&apos;instant.</p>
          ) : (
            <div className="mt-2 rounded-md bg-surface-100 px-3 py-2">
              <p className={`text-2xl font-bold tabular-nums ${classeTaux(assiduite)}`}>{assiduite} %</p>
              <p className="text-xs text-ink-muted">
                {presences.length} séance{presences.length > 1 ? "s" : ""} · {compteursPresence.ABSENT} absence
                {compteursPresence.ABSENT > 1 ? "s" : ""} · {compteursPresence.RETARD} retard
                {compteursPresence.RETARD > 1 ? "s" : ""}
                {compteursPresence.EXCUSE > 0 && <> · {compteursPresence.EXCUSE} excusée{compteursPresence.EXCUSE > 1 ? "s" : ""}</>}
              </p>
            </div>
          )}

          <h2 className="mt-6 font-semibold">Relances</h2>
          {relances.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Aucune relance envoyée.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {relances.map((r) => (
                <li key={r.cle} className="rounded-md bg-surface-100 px-3 py-2">
                  <p className="font-medium">{LABEL_DECLENCHEUR[r.declencheur]}</p>
                  <p className="text-xs text-ink-muted">
                    {r.date ? formatDate(r.date) : "—"}
                    {r.auteur && <> · par {r.auteur}</>}
                    {r.nbEcheances > 1 && <> · {r.nbEcheances} échéances</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
