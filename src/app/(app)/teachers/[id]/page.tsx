import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Link2, MessageCircle, Send } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { formatFcfa } from "@/lib/format";
import {
  ETAT_VOLUME,
  dureeTotaleHebdo,
  etatVolume,
  messageProgrammation,
  minutesHebdo,
  nbSemaines,
} from "@/lib/emploi-du-temps";
import { chargerEmploiDuTemps } from "@/lib/emploi-du-temps-donnees";
import { STATUT_ENSEIGNANT, initialesEnseignant, nomEnseignant } from "@/lib/enseignants";
import { lienWhatsApp } from "@/lib/telephone";
import Badge from "@/components/ui/badge";
import { basculerActifEnseignant } from "../actions";
import TeacherForm from "../teacher-form";

type TeacherPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherPage({ params }: TeacherPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const estDirecteur = membre.role === "DIRECTEUR";
  const { id } = await params;

  const enseignant = await db.enseignant.findFirst({
    where: { id },
    include: { membre: { include: { utilisateur: { select: { nom: true, email: true } } } } },
  });
  if (!enseignant) {
    notFound();
  }

  const [affectations, creneaux, membres, programmation, seances] = await Promise.all([
    db.affectation.findMany({
      where: { enseignantId: enseignant.id, session: { dateFin: { gte: dateDuJour() } } },
      orderBy: { matiere: "asc" },
      include: {
        session: {
          select: { id: true, nom: true, dateDebut: true, dateFin: true, formation: { select: { intitule: true } } },
        },
      },
    }),
    db.creneau.findMany({
      where: { enseignantId: enseignant.id, session: { dateFin: { gte: dateDuJour() } } },
      select: {
        heureDebut: true,
        heureFin: true,
        matiere: true,
        session: { select: { id: true, nom: true, formation: { select: { intitule: true } } } },
      },
    }),
    estDirecteur
      ? db.membre.findMany({
          where: {
            actif: true,
            role: { in: ["FORMATEUR", "DIRECTEUR"] },
            OR: [{ ficheEnseignant: { is: null } }, { ficheEnseignant: { id: enseignant.id } }],
          },
          include: { utilisateur: { select: { nom: true } } },
        })
      : Promise.resolve([]),
    chargerEmploiDuTemps(db, "enseignant", enseignant.id),
    // Cours réellement faits (appel enregistré) par ce professeur
    db.seance.findMany({
      where: { enseignantId: enseignant.id },
      select: { sessionId: true, matiereId: true, date: true, heureDebut: true, heureFin: true },
    }),
  ]);

  const duree = (s: { heureDebut: number | null; heureFin: number | null }) => (s.heureFin ?? 0) - (s.heureDebut ?? 0);
  const aujourdhui = dateDuJour();
  const debutMois = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), 1));
  const heuresRealiseesMois =
    Math.round((seances.filter((s) => s.date >= debutMois).reduce((t, s) => t + duree(s), 0) / 60) * 10) / 10;

  // Heures programmées sur toute la session, pour chaque matière affectée
  const suivi = affectations.map((a) => {
    const cours = creneaux.filter(
      (c) => c.session.id === a.session.id && c.matiere.toLowerCase() === a.matiere.toLowerCase(),
    );
    const programmees = Math.round((minutesHebdo(cours) / 60) * nbSemaines(a.session.dateDebut, a.session.dateFin));
    const realisees =
      Math.round(
        (seances
          .filter((s) => s.sessionId === a.session.id && a.matiereId && s.matiereId === a.matiereId)
          .reduce((t, s) => t + duree(s), 0) /
          60) *
          10,
      ) / 10;
    return {
      ...a,
      hebdo: dureeTotaleHebdo(cours),
      programmees,
      realisees,
      etat: etatVolume(programmees, a.volumeHoraire),
    };
  });

  // Message WhatsApp prêt à envoyer : ses cours jour par jour
  const lienProgrammation =
    enseignant.telephone && programmation && programmation.creneaux.length > 0
      ? `${lienWhatsApp(enseignant.telephone)}?text=${encodeURIComponent(
          messageProgrammation(enseignant.prenom, institut.nom, programmation.creneaux),
        )}`
      : null;

  // Classes où il enseigne, avec le volume hebdomadaire de chacune
  const classes = [...new Map(creneaux.map((c) => [c.session.id, c.session])).values()].map((s) => ({
    ...s,
    cours: creneaux.filter((c) => c.session.id === s.id),
  }));

  const heuresHebdo = creneaux.reduce((t, c) => t + (c.heureFin - c.heureDebut), 0) / 60;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/teachers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Professeurs
      </Link>

      <section className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface-200 p-5 lg:flex-row lg:items-center lg:p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-gold-500">
          {initialesEnseignant(enseignant)}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{nomEnseignant(enseignant)}</h1>
            <Badge ton={STATUT_ENSEIGNANT[enseignant.statut].ton}>
              {STATUT_ENSEIGNANT[enseignant.statut].label}
            </Badge>
            {!enseignant.actif && <Badge ton="neutral">Désactivé</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {[enseignant.specialite, enseignant.telephone, enseignant.email].filter(Boolean).join(" · ") ||
              "Aucune coordonnée"}
          </p>
          {enseignant.membre && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
              <Link2 size={13} aria-hidden="true" />
              Compte Kalaas relié : {enseignant.membre.utilisateur.nom}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {enseignant.telephone && (
            <a
              href={lienWhatsApp(enseignant.telephone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium text-ink hover:bg-surface-100"
            >
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <Link
            href={`/timetable?vue=enseignant&id=${enseignant.id}`}
            className="flex h-11 items-center gap-2 rounded-md border border-border px-4 font-medium text-ink hover:bg-surface-100"
          >
            <CalendarDays size={18} aria-hidden="true" />
            Sa programmation
          </Link>
          {lienProgrammation && (
            <a
              href={lienProgrammation}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-md border border-success/40 bg-success-soft px-4 font-medium text-success hover:opacity-90"
            >
              <Send size={18} aria-hidden="true" />
              Envoyer sa programmation
            </a>
          )}
          <a
            href={`/timetable/pdf?vue=enseignant&id=${enseignant.id}`}
            className="flex h-11 items-center gap-2 rounded-md bg-gold-500 px-4 font-medium text-navy-900 hover:opacity-90"
          >
            <Download size={18} aria-hidden="true" />
            PDF
          </a>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/70">Volume hebdomadaire</p>
          <p className="mt-1 text-2xl font-bold text-gold-500 tabular-nums">{dureeTotaleHebdo(creneaux)}</p>
          <p className="mt-1 text-xs text-white/70">
            {creneaux.length} cours par semaine · {classes.length} classe{classes.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Réalisé ce mois</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success">{heuresRealiseesMois} h</p>
          <p className="mt-1 text-xs text-ink-muted">
            {enseignant.tarifHoraire
              ? `${formatFcfa(Math.round(heuresRealiseesMois * enseignant.tarifHoraire))} à payer`
              : "cours dont l'appel a été fait"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-200 p-5">
          <p className="text-sm text-ink-muted">Coût hebdomadaire estimé</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {enseignant.tarifHoraire ? formatFcfa(Math.round(heuresHebdo * enseignant.tarifHoraire)) : "—"}
          </p>
          {enseignant.tarifHoraire ? (
            <p className="mt-1 text-xs text-ink-muted">{formatFcfa(enseignant.tarifHoraire)} de l&apos;heure</p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">Tarif horaire non renseigné</p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Matières affectées</h2>
          {suivi.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Aucune matière. Affectez-le depuis l&apos;emploi du temps d&apos;une classe (« Professeurs de la
              classe »).
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {suivi.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/timetable?vue=classe&id=${a.session.id}`} className="min-w-0 text-ink">
                    <span className="block truncate font-medium">{a.matiere}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {a.session.formation.intitule} · {a.session.nom}
                    </span>
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-ink-muted tabular-nums">
                      {a.hebdo} / semaine · <span className="font-semibold text-success">réalisé {a.realisees} h</span>
                    </span>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 text-xs tabular-nums ${ETAT_VOLUME[a.etat].classe}`}
                    >
                      {a.volumeHoraire
                        ? `${a.programmees} / ${a.volumeHoraire} h${
                            ETAT_VOLUME[a.etat].label ? ` · ${ETAT_VOLUME[a.etat].label}` : ""
                          }`
                        : `${a.programmees} h sur la session`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface-200 p-5">
          <h2 className="font-semibold">Classes et volume</h2>
          {classes.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Aucun cours programmé. Ajoutez-le dans les emplois du temps des classes.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {classes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/timetable?vue=classe&id=${s.id}`} className="min-w-0 text-ink">
                    <span className="block truncate font-medium">{s.formation.intitule}</span>
                    <span className="text-xs text-ink-muted">{s.nom}</span>
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums">{dureeTotaleHebdo(s.cours)}</span>
                    <span className="text-xs text-ink-muted">{s.cours.length} cours</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>

        {estDirecteur && (
          <section className="rounded-lg border border-border bg-surface-200 p-5">
            <h2 className="mb-4 font-semibold">Modifier la fiche</h2>
            <TeacherForm
              comptes={membres.map((m) => ({ id: m.id, nom: m.utilisateur.nom }))}
              valeurs={{
                id: enseignant.id,
                prenom: enseignant.prenom,
                nom: enseignant.nom,
                telephone: enseignant.telephone ?? "",
                email: enseignant.email ?? "",
                specialite: enseignant.specialite ?? "",
                statut: enseignant.statut,
                tarifHoraire: enseignant.tarifHoraire ?? 0,
                membreId: enseignant.membreId ?? "",
              }}
            />
            <form action={basculerActifEnseignant} className="mt-4 border-t border-border pt-4">
              <input type="hidden" name="id" value={enseignant.id} />
              <button
                type="submit"
                className={`cursor-pointer text-sm font-medium hover:underline ${
                  enseignant.actif ? "text-danger" : "text-success"
                }`}
              >
                {enseignant.actif ? "Désactiver ce professeur" : "Réactiver ce professeur"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
