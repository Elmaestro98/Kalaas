import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getContexte } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { formatHeure } from "@/lib/emploi-du-temps";
import { nomEnseignant } from "@/lib/enseignants";
import { dateIso, jourDeDate, lireDate, type StatutPresence } from "@/lib/presences";
import CallForm, { type LigneAppel } from "../call-form";

type CallPageProps = {
  searchParams: Promise<{ creneau?: string; date?: string }>;
};

export default async function CallPage({ searchParams }: CallPageProps) {
  const { membre, db } = await getContexte();
  const params = await searchParams;
  const date = lireDate(params.date);

  const creneau = params.creneau
    ? await db.creneau.findFirst({
        where: { id: params.creneau },
        include: {
          session: { select: { id: true, nom: true, dateDebut: true, dateFin: true, formation: { select: { intitule: true } } } },
          enseignant: { select: { id: true, prenom: true, nom: true } },
          salle: { select: { nom: true } },
        },
      })
    : null;
  if (!creneau || !date) {
    notFound();
  }

  // Un formateur n'accède qu'aux appels de ses propres cours
  if (membre.role === "FORMATEUR") {
    const maFiche = await db.enseignant.findFirst({ where: { membreId: membre.id } });
    if (!maFiche || creneau.enseignantId !== maFiche.id) {
      redirect("/attendance");
    }
  }
  if (jourDeDate(date) !== creneau.jour || date < creneau.session.dateDebut || date > creneau.session.dateFin) {
    redirect(`/attendance?date=${dateIso(date)}`);
  }

  const [inscriptions, seance] = await Promise.all([
    db.inscription.findMany({
      where: { sessionId: creneau.sessionId, statut: "ACTIVE" },
      include: {
        apprenant: { select: { prenom: true, nom: true, matricule: true } },
        presences: { where: { statut: "ABSENT", seance: { date: { lt: date } } }, select: { id: true } },
      },
    }),
    db.seance.findFirst({
      where: { sessionId: creneau.sessionId, date, creneauId: creneau.id },
      include: {
        presences: { select: { inscriptionId: true, statut: true } },
        appelPar: { select: { utilisateur: { select: { nom: true } } } },
      },
    }),
  ]);

  const statutExistant = new Map(seance?.presences.map((p) => [p.inscriptionId, p.statut as StatutPresence]));

  const lignes: LigneAppel[] = inscriptions
    .map((i) => ({
      inscriptionId: i.id,
      nom: `${i.apprenant.nom.toUpperCase()} ${i.apprenant.prenom}`,
      matricule: i.apprenant.matricule,
      statut: statutExistant.get(i.id) ?? "PRESENT",
      absences: i.presences.length,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/attendance?date=${dateIso(date)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Présences
      </Link>

      <div className="mt-3 rounded-lg border-l-4 border-gold-500 bg-surface-200 p-4">
        <p className="text-sm font-semibold text-gold-700 tabular-nums">
          {formatDate(date)} · {formatHeure(creneau.heureDebut)} – {formatHeure(creneau.heureFin)}
        </p>
        <h1 className="mt-1 text-xl font-semibold lg:text-2xl">{creneau.matiere}</h1>
        <p className="text-sm text-ink-muted">
          {creneau.session.formation.intitule} · {creneau.session.nom}
          {creneau.enseignant && <> · {nomEnseignant(creneau.enseignant)}</>}
          {creneau.salle && <> · {creneau.salle.nom}</>}
        </p>
        {seance && (
          <p className="mt-2 text-xs text-success">
            Appel déjà fait{seance.appelPar ? ` par ${seance.appelPar.utilisateur.nom}` : ""} · vous pouvez le corriger.
          </p>
        )}
      </div>

      <div className="mt-5">
        {lignes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
            Aucun apprenant inscrit dans cette classe.
          </p>
        ) : (
          <CallForm creneauId={creneau.id} date={dateIso(date)} lignes={lignes} dejaFait={Boolean(seance)} />
        )}
      </div>
    </div>
  );
}
