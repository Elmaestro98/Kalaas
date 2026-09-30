import Link from "next/link";
import { CalendarDays, ClipboardCheck, Download, MapPin } from "lucide-react";
import { dateDuJour } from "@/lib/echeancier";
import { dateIso } from "@/lib/presences";
import { getContexte } from "@/lib/tenant";
import {
  JOURS,
  creneauxDuJour,
  dureeTotaleHebdo,
  formatHeure,
  jourActuel,
} from "@/lib/emploi-du-temps";
import { chargerEmploiDuTemps } from "@/lib/emploi-du-temps-donnees";
import WeekGrid from "../timetable/week-grid";

// Tableau de bord d'un formateur : sa semaine, sans aucune donnée financière
export default async function TrainerDashboard() {
  const { institut, membre, db } = await getContexte();
  const prenom = membre.utilisateur.nom.split(" ")[0];

  const fiche = await db.enseignant.findFirst({ where: { membreId: membre.id } });
  const programmation = fiche ? await chargerEmploiDuTemps(db, "enseignant", fiche.id) : null;

  const aujourdhui = jourActuel();
  const libelleJour = JOURS.find((j) => j.valeur === aujourdhui)?.label ?? "";
  const coursDuJour = programmation ? creneauxDuJour(programmation.creneaux, aujourdhui) : [];

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Bonjour {prenom}</h1>
      <p className="mt-1 text-ink-muted">{institut.nom} · Ma semaine</p>

      {!fiche || !programmation ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">Votre programmation n&apos;est pas encore disponible</p>
          <p className="mt-1 text-sm text-ink-muted">
            Votre compte doit être relié à votre fiche professeur. Demandez-le à la direction de
            l&apos;établissement.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-navy-900 p-5 text-white">
              <p className="text-sm text-white/70">Aujourd&apos;hui · {libelleJour}</p>
              <p className="mt-1 text-3xl font-bold text-gold-500 tabular-nums">{coursDuJour.length}</p>
              <p className="mt-1 text-xs text-white/70">
                cours · {dureeTotaleHebdo(coursDuJour)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-200 p-5">
              <p className="text-sm text-ink-muted">Cette semaine</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{programmation.creneaux.length}</p>
              <p className="mt-1 text-xs text-ink-muted">
                cours · {dureeTotaleHebdo(programmation.creneaux)}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2 rounded-lg border border-border bg-surface-200 p-5">
              <a
                href={`/timetable/pdf?vue=enseignant&id=${fiche.id}`}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-gold-500 font-medium text-navy-900 hover:opacity-90"
              >
                <Download size={18} aria-hidden="true" />
                Télécharger mon emploi du temps
              </a>
              <Link
                href="/timetable"
                className="flex h-10 items-center justify-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
              >
                <CalendarDays size={16} aria-hidden="true" />
                Voir en grand
              </Link>
            </div>
          </div>

          <section className="mt-6 rounded-lg border border-border bg-surface-200 p-5">
            <h2 className="font-semibold">Mes cours d&apos;aujourd&apos;hui</h2>
            {coursDuJour.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Pas de cours aujourd&apos;hui.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {coursDuJour.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border-l-4 border-gold-500 bg-surface-100 px-4 py-3"
                  >
                    <span className="w-32 font-semibold tabular-nums text-gold-700">
                      {formatHeure(c.heureDebut)} – {formatHeure(c.heureFin)}
                    </span>
                    <span className="min-w-40 flex-1">
                      <span className="block font-semibold">{c.matiere}</span>
                      {c.details[0] && <span className="text-sm text-ink-muted">{c.details[0]}</span>}
                    </span>
                    {c.details[1] && (
                      <span className="flex items-center gap-1 text-sm text-ink-muted">
                        <MapPin size={14} aria-hidden="true" />
                        {c.details[1]}
                      </span>
                    )}
                    <Link
                      href={`/attendance/call?creneau=${c.id}&date=${dateIso(dateDuJour())}`}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover sm:w-auto"
                    >
                      <ClipboardCheck size={16} aria-hidden="true" />
                      Faire l&apos;appel
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-semibold">Ma semaine</h2>
            <WeekGrid creneaux={programmation.creneaux} peutModifier={false} />
          </section>
        </>
      )}
    </div>
  );
}
