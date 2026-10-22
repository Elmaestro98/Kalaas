import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { estScolaire } from "@/lib/lmd";
import { vocabulaire } from "@/lib/etablissement";
import { classesPourNotes, matieresNotables } from "@/lib/notes-donnees";
import { chargerBulletins } from "@/lib/bulletins-donnees";
import { formatRang, libellePeriode, periodes as listePeriodes, proposerDecision, proposerDistinction } from "@/lib/bulletins";
import ClassSelect from "../class-select";
import PeriodTabs from "../period-tabs";
import AppreciationGrid, { type LigneAppreciation } from "./appreciation-grid";

type ReportCardsPageProps = {
  searchParams: Promise<{ session?: string; periode?: string; cible?: string }>;
};

// Appréciations des professeurs, avis du conseil de classe et bulletins (écoles uniquement)
export default async function ReportCardsPage({ searchParams }: ReportCardsPageProps) {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "FORMATEUR");
  const mots = vocabulaire(institut.typeEtablissement);
  const estDirecteur = membre.role === "DIRECTEUR";
  const params = await searchParams;
  const decoupage = institut.decoupageScolaire;

  const sessions = (await classesPourNotes(db, membre)).filter((s) => estScolaire(s.formation.cycle));
  const classes = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.intitule} · ${s.nom}`,
    groupe: s.anneeAcademique ? `Année ${s.anneeAcademique.libelle}` : "Sans année",
  }));
  const session = sessions.find((s) => s.id === params.session) ?? sessions[0];

  const entete = (
    <>
      <Link
        href={session ? `/grades?session=${session.id}` : "/grades"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Notes
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">Appréciations et bulletins</h1>
    </>
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-6xl">
        {entete}
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center text-sm text-ink-muted">
          Aucune classe d&apos;école en cours{estDirecteur ? "." : " pour vous."}
        </p>
      </div>
    );
  }

  const periodes = listePeriodes(decoupage);
  const periode = periodes.includes(Number(params.periode)) ? Number(params.periode) : 1;

  const [donnees, notables] = await Promise.all([
    chargerBulletins(db, session.id, decoupage, periode),
    matieresNotables(db, membre, session.id),
  ]);
  if (!donnees) return null;
  const { resultats, bulletins } = donnees;

  // Cibles possibles : le conseil de classe (direction) puis les matières que l'on peut noter
  const matieres = notables === "TOUTES" ? resultats.matieres : resultats.matieres.filter((m) => notables.has(m.id));
  const cibles = [...(estDirecteur ? [{ id: "conseil", label: "Conseil de classe" }] : []), ...matieres.map((m) => ({ id: m.id, label: m.intitule }))];
  const cible = cibles.find((c) => c.id === params.cible) ?? cibles[0];
  // Dernière période : le conseil de classe décide aussi du passage ou du redoublement
  const finAnnee = cible?.id === "conseil" && periode === periodes.length;
  const lien = (p: number, c?: string) => `/grades/report-cards?session=${session.id}&periode=${p}${c ? `&cible=${c}` : ""}`;

  const lignes: LigneAppreciation[] = cible
    ? bulletins.map((b) => {
        const res = b.ligne.periodes[periode];
        if (cible.id === "conseil") {
          return {
            inscriptionId: b.inscriptionId,
            nom: b.eleve.nom,
            moyenne: res.moyenne,
            rang: res.rang ? `${formatRang(res.rang, res.exAequo)}/${b.effectif}` : null,
            texte: b.conseil.appreciation ?? "",
            // Pas encore d'avis enregistré : la distinction est proposée d'après la moyenne
            distinction: b.conseil.appreciation || b.conseil.distinction ? b.conseil.distinction : proposerDistinction(res.moyenne),
            moyenneAnnuelle: b.ligne.annuelle.moyenne,
            decision: b.ligne.decision ?? proposerDecision(b.ligne.annuelle.moyenne),
          };
        }
        return {
          inscriptionId: b.inscriptionId,
          nom: b.eleve.nom,
          moyenne: res.moyennes[cible.id]?.moyenne ?? null,
          rang: null,
          texte: b.appreciations[cible.id] ?? "",
          distinction: null,
          moyenneAnnuelle: null,
          decision: null,
        };
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      {entete}
      <p className="mt-1 text-sm text-ink-muted">
        Les professeurs rédigent l&apos;appréciation de leur matière ; la direction rédige l&apos;avis du conseil de
        classe. Le tout figure sur le bulletin de la période.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <ClassSelect valeur={session.id} chemin="/grades/report-cards" classes={classes} />
        </div>
        {estDirecteur && bulletins.length > 0 && resultats.evaluations[periode] > 0 && (
          <a
            href={`/grades/report-cards/pdf?session=${session.id}&periode=${periode}`}
            download
            className="flex h-11 items-center gap-2 rounded-md bg-action px-4 font-medium text-on-action hover:bg-action-hover"
          >
            <FileDown size={18} aria-hidden="true" />
            Bulletins de la classe (PDF)
          </a>
        )}
      </div>

      <PeriodTabs
        className="mt-4"
        lien={(p) => lien(p as number, cible?.id)}
        periodes={periodes.map((p) => ({ valeur: p, label: libellePeriode(decoupage, p) }))}
        active={periode}
      />

      {resultats.evaluations[periode] === 0 && (
        <p className="mt-3 rounded-sm bg-warning-soft px-4 py-2 text-sm text-warning">
          Aucune évaluation au {libellePeriode(decoupage, periode)} : les moyennes sont vides.
        </p>
      )}

      {cibles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucune matière à apprécier pour vous dans cette classe.
        </p>
      ) : bulletins.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Aucun {mots.apprenant} dans cette classe.
        </p>
      ) : (
        <>
          <nav aria-label="Appréciations à saisir" className="mt-4 flex flex-wrap gap-2">
            {cibles.map((c) => (
              <Link
                key={c.id}
                href={lien(periode, c.id)}
                aria-current={c.id === cible?.id ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  c.id === cible?.id
                    ? "border-navy-900 bg-navy-900 font-semibold text-white"
                    : "border-border bg-surface-200 text-ink hover:bg-surface-100"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </nav>
          {cible && (
            <AppreciationGrid
              key={`${cible.id}-${periode}`}
              sessionId={session.id}
              periode={periode}
              cible={cible.id}
              lignes={lignes}
              finAnnee={finAnnee}
            />
          )}
        </>
      )}
    </div>
  );
}
