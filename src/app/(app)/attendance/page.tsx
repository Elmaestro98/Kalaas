import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { getContexte } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { formatHeure, JOURS } from "@/lib/emploi-du-temps";
import { chargerCoursDuJour } from "@/lib/presences-donnees";
import { dateIso, jourDeDate, lireDate } from "@/lib/presences";

type AttendancePageProps = {
  searchParams: Promise<{ date?: string; ok?: string }>;
};

const JOUR_MS = 86_400_000;

const formateurDateLongue = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const { membre, db } = await getContexte();
  const params = await searchParams;

  const aujourdhui = dateDuJour();
  const demandee = lireDate(params.date);
  const date = demandee && demandee <= aujourdhui ? demandee : aujourdhui;
  const estAujourdhui = date.getTime() === aujourdhui.getTime();

  // Un formateur ne voit que ses cours (via sa fiche professeur)
  const estFormateur = membre.role === "FORMATEUR";
  const maFiche = estFormateur ? await db.enseignant.findFirst({ where: { membreId: membre.id } }) : null;
  const cours = estFormateur && !maFiche ? [] : await chargerCoursDuJour(db, date, maFiche?.id);

  const faits = cours.filter((c) => c.appel).length;
  const libelleJour = JOURS.find((j) => j.valeur === jourDeDate(date))?.label ?? "";
  const veille = dateIso(new Date(date.getTime() - JOUR_MS));
  const lendemain = new Date(date.getTime() + JOUR_MS);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Présences</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {estFormateur ? "Faites l'appel de vos cours." : "Appel par cours, d'après les emplois du temps."}
      </p>

      {params.ok && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          Appel enregistré.
        </p>
      )}

      {/* Navigation par jour */}
      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/attendance?date=${veille}`}
          aria-label="Jour précédent"
          className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <div className="flex-1 text-center">
          <p className="font-semibold">
            {libelleJour} {formateurDateLongue.format(date)}
          </p>
          <p className="text-xs text-ink-muted">
            {estAujourdhui ? "Aujourd'hui" : <Link href="/attendance">Revenir à aujourd&apos;hui</Link>}
            {cours.length > 0 && ` · ${faits}/${cours.length} appel${cours.length > 1 ? "s" : ""} fait${faits > 1 ? "s" : ""}`}
          </p>
        </div>
        {lendemain <= aujourdhui ? (
          <Link
            href={`/attendance?date=${dateIso(lendemain)}`}
            aria-label="Jour suivant"
            className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-200 hover:bg-surface-100"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
      </div>

      {estFormateur && !maFiche ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center text-sm text-ink-muted">
          Votre compte n&apos;est pas encore relié à une fiche professeur. Demandez-le à la direction.
        </p>
      ) : cours.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">Aucun cours ce jour-là</p>
          <p className="mt-1 text-sm text-ink-muted">
            Les cours proviennent des emplois du temps des classes.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {cours.map((c) => (
            <li
              key={c.creneauId}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-surface-200 p-4"
            >
              <span className="w-28 font-semibold tabular-nums text-gold-700">
                {formatHeure(c.heureDebut)} – {formatHeure(c.heureFin)}
              </span>
              <div className="min-w-44 flex-1">
                <p className="font-semibold">{c.matiere}</p>
                <p className="text-xs text-ink-muted">
                  {c.classe}
                  {!estFormateur && c.enseignant && <> · {c.enseignant}</>}
                  {c.salle && <> · {c.salle}</>}
                </p>
              </div>
              {c.appel ? (
                <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  ✓ {c.appel.presents}/{c.appel.total} présents
                </span>
              ) : (
                <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                  Appel à faire
                </span>
              )}
              <Link
                href={`/attendance/call?creneau=${c.creneauId}&date=${dateIso(date)}`}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 font-medium sm:w-auto ${
                  c.appel
                    ? "border border-border text-ink hover:bg-surface-100"
                    : "bg-action text-on-action hover:bg-action-hover"
                }`}
              >
                <ClipboardCheck size={18} aria-hidden="true" />
                {c.appel ? "Modifier" : "Faire l'appel"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
