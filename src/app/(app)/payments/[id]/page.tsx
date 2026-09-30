import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, MessageCircle, Plus } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate, formatFcfa, formatNombre } from "@/lib/format";
import { nombreEnLettres } from "@/lib/lettres";
import { lienWhatsApp } from "@/lib/telephone";
import { resumeFinancier } from "@/lib/echeancier";
import { LABEL_MODE, peutAnnulerPaiement } from "@/lib/paiements";
import Badge from "@/components/ui/badge";
import PrintButton from "./print-button";
import CancelForm from "./cancel-form";

type PaymentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
};

const formateurHeure = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;
  const { nouveau } = await searchParams;

  const paiement = await db.paiement.findFirst({
    where: { id },
    include: {
      apprenant: true,
      caissier: { include: { utilisateur: { select: { nom: true } } } },
      annulation: { include: { auteur: { include: { utilisateur: { select: { nom: true } } } } } },
      repartitions: {
        include: {
          echeance: {
            include: {
              inscription: {
                include: { session: { select: { nom: true, formation: { select: { intitule: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!paiement) {
    notFound();
  }

  const echeancesApprenant = await db.echeance.findMany({
    where: { inscription: { apprenantId: paiement.apprenantId, statut: { in: ["ACTIVE", "TERMINEE"] } } },
    select: { montantDu: true, montantPaye: true, dateLimite: true, statut: true },
  });
  const situation = resumeFinancier(echeancesApprenant);

  const annule = paiement.annulation !== null;
  const lignes = [...paiement.repartitions].sort(
    (a, b) => a.echeance.dateLimite.getTime() - b.echeance.dateLimite.getTime() || a.echeance.ordre - b.echeance.ordre,
  );
  const formation = lignes[0]?.echeance.inscription.session;
  const apprenant = paiement.apprenant;

  const messageWhatsApp = [
    `Bonjour ${apprenant.prenom},`,
    `${institut.nom} confirme la réception de ${formatFcfa(paiement.montant)} (${LABEL_MODE[paiement.mode]}).`,
    `Reçu n° ${paiement.numeroRecu} du ${formatDate(paiement.date)}.`,
    situation.reste > 0
      ? `Reste à payer : ${formatFcfa(situation.reste)}.`
      : "Votre formation est entièrement réglée. Merci !",
  ].join("\n");
  const lienPartage = `${lienWhatsApp(apprenant.telephone)}?text=${encodeURIComponent(messageWhatsApp)}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Bandeau de confirmation (écran uniquement) */}
      {nouveau && !annule && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-success-soft p-4 text-success print:hidden">
          <CheckCircle2 size={28} aria-hidden="true" />
          <div>
            <p className="font-semibold">{formatFcfa(paiement.montant)} encaissés</p>
            <p className="text-sm">
              {apprenant.prenom} {apprenant.nom} · reçu {paiement.numeroRecu}
            </p>
          </div>
        </div>
      )}

      {annule && paiement.annulation && (
        <div className="mb-6 rounded-lg bg-danger-soft p-4 text-danger print:hidden">
          <p className="font-semibold">Paiement annulé</p>
          <p className="text-sm">
            Le {formatDate(paiement.annulation.date)} par {paiement.annulation.auteur.utilisateur.nom} ·{" "}
            {paiement.annulation.motif}
          </p>
        </div>
      )}

      {/* Actions (écran uniquement) */}
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <a
          href={`/payments/${paiement.id}/pdf`}
          className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
        >
          <Download size={18} aria-hidden="true" />
          PDF
        </a>
        {!annule && (
          <a
            href={lienPartage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Envoyer sur WhatsApp
          </a>
        )}
        <span className="flex-1" />
        <Link
          href="/payments/new"
          className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-4 font-medium text-navy-900 hover:opacity-90"
        >
          <Plus size={18} aria-hidden="true" />
          Nouvel encaissement
        </Link>
      </div>

      {/* Le reçu */}
      <article className="relative overflow-hidden rounded-lg border border-border bg-white p-6 text-navy-900 shadow-[var(--shadow-card)] sm:p-8 print:border-0 print:p-0 print:shadow-none">
        {annule && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold uppercase text-danger/15 -rotate-12"
          >
            Annulé
          </p>
        )}

        <header className="flex flex-col gap-4 border-b-2 border-gold-500 pb-5 sm:flex-row sm:justify-between">
          <div>
            <p className="text-lg font-bold">{institut.nom}</p>
            <p className="text-xs text-[#5B6675]">
              {[institut.adresse, institut.ville].filter(Boolean).join(", ")}
              {institut.telephone && <> · {institut.telephone}</>}
            </p>
            {(institut.ninea || institut.rccm) && (
              <p className="text-xs text-[#5B6675]">
                {institut.ninea && <>NINEA {institut.ninea}</>}
                {institut.ninea && institut.rccm && " · "}
                {institut.rccm && <>RCCM {institut.rccm}</>}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold tracking-wider text-[#7A5F22]">REÇU DE PAIEMENT</p>
            <p className="text-lg font-bold">N° {paiement.numeroRecu}</p>
            <p className="text-xs text-[#5B6675]">{formateurHeure.format(paiement.date)}</p>
          </div>
        </header>

        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#5B6675]">REÇU DE</p>
            <p className="font-semibold">
              {apprenant.prenom} {apprenant.nom}
            </p>
            <p className="text-xs text-[#5B6675]">{apprenant.telephone}</p>
          </div>
          {formation && (
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#5B6675]">FORMATION</p>
              <p className="font-semibold">{formation.formation.intitule}</p>
              <p className="text-xs text-[#5B6675]">{formation.nom}</p>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4DFD3] text-left text-xs text-[#5B6675]">
              <th scope="col" className="py-2 font-semibold">Désignation</th>
              <th scope="col" className="py-2 font-semibold">Échéance</th>
              <th scope="col" className="py-2 text-right font-semibold">Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-b border-[#E4DFD3]">
                <td className="py-2">
                  {l.echeance.libelle}
                  {l.montant < l.echeance.montantDu && <span className="text-[#5B6675]"> (partiel)</span>}
                </td>
                <td className="py-2">{formatDate(l.echeance.dateLimite)}</td>
                <td className="py-2 text-right tabular-nums">{formatNombre(l.montant)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 font-semibold">Total payé</td>
              <td className="pt-3 text-right text-lg font-bold tabular-nums">{formatNombre(paiement.montant)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-sm">
          Arrêté le présent reçu à la somme de{" "}
          <b>
            {nombreEnLettres(paiement.montant)} ({formatNombre(paiement.montant)}) francs CFA
          </b>
          .
        </p>

        <div className="mt-5 grid gap-4 rounded-md bg-[#F7F5F0] p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#5B6675]">RÈGLEMENT</p>
            <p>
              {LABEL_MODE[paiement.mode]}
              {paiement.reference && <> · réf. {paiement.reference}</>}
            </p>
            <p className="text-xs text-[#5B6675]">
              Encaissé par {paiement.caissier?.utilisateur.nom ?? "paiement en ligne"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#5B6675]">SITUATION À CE JOUR</p>
            <p className="flex justify-between">
              <span>Total formation</span>
              <span className="tabular-nums">{formatNombre(situation.total)}</span>
            </p>
            <p className="flex justify-between">
              <span>Payé à ce jour</span>
              <span className="tabular-nums">{formatNombre(situation.paye)}</span>
            </p>
            <p className="flex justify-between font-semibold">
              <span>Reste à payer</span>
              <span className="tabular-nums">{formatNombre(situation.reste)}</span>
            </p>
            {situation.prochaine && (
              <p className="mt-1 text-xs text-[#5B6675]">
                Prochaine échéance : {formatDate(situation.prochaine.date)}
              </p>
            )}
          </div>
        </div>

        {institut.piedRecu && <p className="mt-5 text-center text-sm italic">{institut.piedRecu}</p>}

        <footer className="mt-6 flex items-end justify-between gap-4 border-t border-[#E4DFD3] pt-4 text-xs text-[#5B6675]">
          <div>
            <p className="font-semibold tracking-wider">CACHET ET SIGNATURE</p>
            <div className="mt-2 h-14 w-40 rounded border border-dashed border-[#E4DFD3]" />
          </div>
          <p className="text-right">
            Document généré électroniquement.
            <br />
            Généré avec Kalaas
          </p>
        </footer>
      </article>

      <div className="mt-4 flex flex-wrap items-center gap-4 print:hidden">
        <Link href={`/students/${apprenant.id}`} className="text-sm font-semibold">
          ← Fiche de {apprenant.prenom}
        </Link>
        {annule ? (
          <Badge ton="danger">Annulé</Badge>
        ) : (
          peutAnnulerPaiement(membre, paiement) && (
            <div className="w-full sm:ml-auto sm:w-auto">
              <CancelForm paiementId={paiement.id} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
