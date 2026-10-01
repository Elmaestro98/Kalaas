import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { TYPES_EVALUATION, noteVersSaisie, type StatutNoteSaisie } from "@/lib/notes";
import { peutNoter } from "@/lib/notes-donnees";
import GradeGrid, { type LigneNote } from "../grade-grid";

type EntryPageProps = {
  searchParams: Promise<{ evaluation?: string }>;
};

export default async function EntryPage({ searchParams }: EntryPageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR", "FORMATEUR");
  const { evaluation: evaluationId } = await searchParams;

  const evaluation = evaluationId
    ? await db.evaluation.findFirst({
        where: { id: evaluationId },
        include: {
          matiere: { select: { intitule: true, coefficient: true } },
          session: { select: { id: true, nom: true, formation: { select: { intitule: true } } } },
          notes: { select: { inscriptionId: true, statut: true, valeur: true } },
        },
      })
    : null;
  if (!evaluation) {
    notFound();
  }
  if (!(await peutNoter(db, membre, evaluation.sessionId, evaluation.matiereId))) {
    redirect("/grades");
  }

  const inscriptions = await db.inscription.findMany({
    where: { sessionId: evaluation.sessionId, statut: { in: ["ACTIVE", "TERMINEE"] } },
    include: { apprenant: { select: { prenom: true, nom: true, matricule: true } } },
  });

  const lignes: LigneNote[] = inscriptions
    .map((i) => {
      const note = evaluation.notes.find((n) => n.inscriptionId === i.id);
      return {
        inscriptionId: i.id,
        nom: `${i.apprenant.nom.toUpperCase()} ${i.apprenant.prenom}`,
        matricule: i.apprenant.matricule,
        saisie: note?.statut === "NOTEE" ? noteVersSaisie(note.valeur) : "",
        statut: (note?.statut ?? "NOTEE") as StatutNoteSaisie,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const retour = `/grades?session=${evaluation.sessionId}`;
  const type = TYPES_EVALUATION.find((t) => t.valeur === evaluation.type)?.label;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={retour} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Notes
      </Link>

      <div className="mt-3 rounded-lg border-l-4 border-gold-500 bg-surface-200 p-4">
        <p className="text-sm font-semibold text-gold-700">
          {type} · {evaluation.date ? formatDate(evaluation.date) : "date libre"} · poids {evaluation.poids} % · sur{" "}
          {evaluation.bareme}
        </p>
        <h1 className="mt-1 text-xl font-semibold lg:text-2xl">
          {evaluation.matiere.intitule} — {evaluation.intitule}
        </h1>
        <p className="text-sm text-ink-muted">
          {evaluation.session.formation.intitule} · {evaluation.session.nom} · coef {evaluation.matiere.coefficient ?? 1}
        </p>
        {evaluation.verrouillee && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-muted">
            <Lock size={14} aria-hidden="true" />
            Évaluation verrouillée par la direction : consultation seulement.
          </p>
        )}
      </div>

      <div className="mt-5">
        {lignes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
            Aucun apprenant inscrit dans cette classe.
          </p>
        ) : (
          <GradeGrid
            evaluationId={evaluation.id}
            bareme={evaluation.bareme}
            verrouillee={evaluation.verrouillee}
            lignes={lignes}
            retour={retour}
          />
        )}
      </div>
    </div>
  );
}
