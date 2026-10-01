import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { Enseignant, Matiere } from "@prisma/client";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa } from "@/lib/format";
import { CYCLES, codeNiveau, estLmd } from "@/lib/lmd";
import { nomEnseignant } from "@/lib/enseignants";
import Badge from "@/components/ui/badge";
import { basculerMatiere, basculerUE } from "../subject-actions";
import SubjectForm from "./subject-form";
import UEForm from "./ue-form";

type CoursePageProps = {
  params: Promise<{ id: string }>;
};

type MatiereAvecProf = Matiere & { enseignantHabituel: Pick<Enseignant, "prenom" | "nom"> | null };

const texte = (n: number | null) => (n === null ? "" : String(n));

function LigneMatiere({
  m,
  lmd,
  formationId,
  enseignants,
  ues,
  modifiable,
}: {
  m: MatiereAvecProf;
  lmd: boolean;
  formationId: string;
  enseignants: { id: string; nom: string }[];
  ues: { id: string; libelle: string }[];
  modifiable: boolean;
}) {
  return (
    <li className="px-5 py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
          <span className="min-w-40 flex-1">
            <span className="font-semibold">{m.intitule}</span>
            {m.code && <span className="ml-2 font-mono text-xs text-ink-muted">{m.code}</span>}
            <span className="block text-xs text-ink-muted">
              {[
                m.enseignantHabituel && nomEnseignant(m.enseignantHabituel),
                lmd && (m.heuresCM || m.heuresTD || m.heuresTP)
                  ? `CM ${m.heuresCM ?? 0} · TD ${m.heuresTD ?? 0} · TP ${m.heuresTP ?? 0}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </span>
          <span className="text-sm tabular-nums">{m.volumeHoraire ? `${m.volumeHoraire} h` : "—"}</span>
          <span className="w-28 text-right text-xs text-ink-muted tabular-nums">
            coef {m.coefficient ?? 1}
            {lmd && m.credits ? ` · ${m.credits} cr.` : ""}
          </span>
          {modifiable && <span className="text-xs font-medium text-gold-700 group-open:hidden">Modifier</span>}
        </summary>
        {modifiable && (
          <div className="mt-3 rounded-md bg-surface-100 p-3">
            <SubjectForm
              formationId={formationId}
              lmd={lmd}
              enseignants={enseignants}
              ues={ues}
              valeurs={{
                id: m.id,
                intitule: m.intitule,
                code: m.code ?? "",
                volumeHoraire: texte(m.volumeHoraire),
                heuresCM: texte(m.heuresCM),
                heuresTD: texte(m.heuresTD),
                heuresTP: texte(m.heuresTP),
                coefficient: texte(m.coefficient),
                credits: texte(m.credits),
                semestre: texte(m.semestre),
                ueId: m.ueId ?? "",
                enseignantHabituelId: m.enseignantHabituelId ?? "",
              }}
            />
            <form action={basculerMatiere} className="mt-2">
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className="cursor-pointer text-xs font-medium text-danger hover:underline">
                Désactiver cette matière
              </button>
            </form>
          </div>
        )}
      </details>
    </li>
  );
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { membre, db } = await exigerRole("DIRECTEUR");
  const { id } = await params;
  const estDirecteur = membre.role === "DIRECTEUR";

  const formation = await db.formation.findFirst({
    where: { id },
    include: {
      matieres: {
        orderBy: [{ active: "desc" }, { ordre: "asc" }, { intitule: "asc" }],
        include: { enseignantHabituel: { select: { prenom: true, nom: true } } },
      },
      unitesEnseignement: { orderBy: [{ semestre: "asc" }, { ordre: "asc" }, { intitule: "asc" }] },
      _count: { select: { sessions: true } },
    },
  });
  if (!formation) {
    notFound();
  }

  const enseignants = (
    await db.enseignant.findMany({ where: { actif: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] })
  ).map((e) => ({ id: e.id, nom: nomEnseignant(e) }));

  const lmd = estLmd(formation.cycle);
  const actives = formation.matieres.filter((m) => m.active);
  const inactives = formation.matieres.filter((m) => !m.active);
  const uesActives = formation.unitesEnseignement.filter((u) => u.active);
  const uesInactives = formation.unitesEnseignement.filter((u) => !u.active);
  const optionsUE = uesActives.map((u) => ({
    id: u.id,
    libelle: `${u.code ? `${u.code} · ` : ""}${u.intitule}${u.semestre ? ` (S${u.semestre})` : ""}`,
  }));

  const volumeTotal = actives.reduce((s, m) => s + (m.volumeHoraire ?? 0), 0);
  const creditsTotal = uesActives.reduce((s, u) => s + (u.credits ?? 0), 0);

  // LMD : semestre → UE → matières ; les matières sans UE sont listées à part
  const semestres = [...new Set([...uesActives.map((u) => u.semestre), ...actives.filter((m) => !m.ueId).map((m) => m.semestre)])].sort(
    (a, b) => (a ?? 99) - (b ?? 99),
  );
  const matieresDe = (ueId: string) => actives.filter((m) => m.ueId === ueId);
  const sansUE = (semestre: number | null) =>
    actives.filter((m) => (!m.ueId || !uesActives.some((u) => u.id === m.ueId)) && m.semestre === semestre);

  const propsLigne = { lmd, formationId: formation.id, enseignants, ues: optionsUE, modifiable: estDirecteur };

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Formations
      </Link>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold lg:text-3xl">{formation.intitule}</h1>
            {lmd && <Badge ton={CYCLES[formation.cycle].ton}>{codeNiveau(formation.cycle, formation.niveau)}</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {CYCLES[formation.cycle].label} · {formation.dureeMois} mois ·{" "}
            {formatFcfa(formation.fraisInscription + formation.prixTotal)} · {formation._count.sessions} session
            {formation._count.sessions > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/courses/sessions/new?formation=${formation.id}`}
          className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
        >
          <Plus size={18} aria-hidden="true" />
          Ouvrir une session
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        {/* Programme */}
        <section className="rounded-lg border border-border bg-surface-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
            <h2 className="font-semibold">Programme · {actives.length} matière{actives.length > 1 ? "s" : ""}</h2>
            <p className="text-sm text-ink-muted">
              {volumeTotal} h{lmd && creditsTotal > 0 && ` · ${creditsTotal} crédits`}
            </p>
          </div>

          {actives.length === 0 && uesActives.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">
              {lmd
                ? "Commencez par créer les UE de chaque semestre (colonne de droite), puis ajoutez leurs matières avec leur coefficient."
                : "Aucune matière. Ajoutez le programme : chaque matière a un coefficient, utilisé pour la moyenne générale."}
            </p>
          ) : !lmd ? (
            <ul className="divide-y divide-border">
              {actives.map((m) => (
                <LigneMatiere key={m.id} m={m} {...propsLigne} />
              ))}
            </ul>
          ) : (
            semestres.map((semestre) => (
              <div key={semestre ?? "aucun"}>
                <h3 className="bg-navy-900 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                  {semestre ? `Semestre ${semestre}` : "Semestre non précisé"}
                </h3>
                {uesActives
                  .filter((u) => u.semestre === semestre)
                  .map((u) => {
                    const siennes = matieresDe(u.id);
                    const sommeCoef = siennes.reduce((s, m) => s + (m.coefficient ?? 1), 0);
                    return (
                      <div key={u.id} className="border-b border-border">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-100 px-5 py-2 text-sm">
                          <span className="flex-1 font-semibold">
                            {u.code && <span className="mr-2 font-mono text-gold-700">{u.code}</span>}
                            {u.intitule}
                          </span>
                          <span className="text-xs text-ink-muted tabular-nums">
                            {u.credits ?? 0} crédits · Σ coef {sommeCoef}
                          </span>
                          {estDirecteur && (
                            <details className="w-full">
                              <summary className="cursor-pointer text-xs font-medium text-gold-700">Modifier l&apos;UE</summary>
                              <div className="mt-2 rounded-md bg-surface-200 p-3">
                                <UEForm
                                  formationId={formation.id}
                                  valeurs={{
                                    id: u.id,
                                    code: u.code ?? "",
                                    intitule: u.intitule,
                                    semestre: texte(u.semestre),
                                    credits: texte(u.credits),
                                  }}
                                />
                                <form action={basculerUE} className="mt-2">
                                  <input type="hidden" name="id" value={u.id} />
                                  <button type="submit" className="cursor-pointer text-xs font-medium text-danger hover:underline">
                                    Désactiver cette UE
                                  </button>
                                </form>
                              </div>
                            </details>
                          )}
                        </div>
                        {siennes.length === 0 ? (
                          <p className="px-5 py-2 text-xs text-ink-muted">Aucune matière dans cette UE.</p>
                        ) : (
                          <ul className="divide-y divide-border">
                            {siennes.map((m) => (
                              <LigneMatiere key={m.id} m={m} {...propsLigne} />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                {sansUE(semestre).length > 0 && (
                  <div className="border-b border-border">
                    <p className="bg-warning-soft px-5 py-2 text-xs font-semibold text-warning">
                      Matières sans UE : rattachez-les à une UE (chacune comptera sinon comme une UE à part)
                    </p>
                    <ul className="divide-y divide-border">
                      {sansUE(semestre).map((m) => (
                        <LigneMatiere key={m.id} m={m} {...propsLigne} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}

          {(inactives.length > 0 || uesInactives.length > 0) && (
            <details className="border-t border-border px-5 py-3 text-sm">
              <summary className="cursor-pointer text-ink-muted">Éléments désactivés</summary>
              <ul className="mt-2 space-y-1">
                {uesInactives.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">UE · {u.intitule}</span>
                    <form action={basculerUE}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="cursor-pointer text-xs font-medium text-success hover:underline">
                        Réactiver
                      </button>
                    </form>
                  </li>
                ))}
                {inactives.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">{m.intitule}</span>
                    <form action={basculerMatiere}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="cursor-pointer text-xs font-medium text-success hover:underline">
                        Réactiver
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Ajouts */}
        {estDirecteur && (
          <aside className="space-y-6 lg:sticky lg:top-24">
            {lmd && (
              <div className="rounded-lg border border-border bg-surface-200 p-5">
                <h2 className="mb-3 font-semibold">Ajouter une UE</h2>
                <UEForm formationId={formation.id} />
                <p className="mt-3 text-xs text-ink-muted">
                  Moyenne d&apos;UE = moyenne des matières pondérée par leurs coefficients. Moyenne du semestre = moyenne
                  des UE pondérée par leurs crédits.
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-surface-200 p-5">
              <h2 className="mb-3 font-semibold">Ajouter une matière</h2>
              <SubjectForm formationId={formation.id} lmd={lmd} enseignants={enseignants} ues={optionsUE} />
              <p className="mt-3 text-xs text-ink-muted">Sans coefficient saisi, une matière compte pour 1.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
