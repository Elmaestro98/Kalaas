import { formatDate } from "@/lib/format";
import { STATUT_SESSION, statutSession } from "@/lib/sessions";

export type LigneSession = {
  id: string;
  nom: string;
  formation: string;
  annee: string | null;
  dateDebut: Date;
  dateFin: Date;
  horaires: string | null;
  formateur: string | null;
  inscrits: number;
  capacite: number | null;
};

function Places({ inscrits, capacite }: { inscrits: number; capacite: number | null }) {
  if (!capacite) {
    return (
      <span className="tabular-nums">
        {inscrits} inscrit{inscrits > 1 ? "s" : ""}
      </span>
    );
  }
  const pourcentage = Math.min(100, Math.round((inscrits / capacite) * 100));
  const restantes = capacite - inscrits;

  return (
    <div className="min-w-32">
      <div className="flex justify-between gap-2 text-sm">
        <span className="tabular-nums">
          <b className="font-semibold">{inscrits}</b>/{capacite}
        </span>
        <span className="text-xs text-ink-muted">
          {restantes <= 0 ? "Complet" : `${restantes} place${restantes > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-surface-100">
        <div
          className={`h-1.5 rounded-full ${restantes <= 0 ? "bg-gold-500" : "bg-navy-900"}`}
          style={{ width: `${pourcentage}%` }}
        />
      </div>
    </div>
  );
}

function Statut({ debut, fin }: { debut: Date; fin: Date }) {
  const { label, classe } = STATUT_SESSION[statutSession(debut, fin)];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${classe}`}
    >
      {label}
    </span>
  );
}

export default function SessionsList({ sessions }: { sessions: LigneSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
        Aucune session ouverte pour l&apos;instant.
      </p>
    );
  }

  return (
    <>
      {/* Ordinateur : tableau */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-100 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Session</th>
              <th scope="col" className="px-4 py-3">Période · horaires</th>
              <th scope="col" className="px-4 py-3">Formateur</th>
              <th scope="col" className="px-4 py-3">Places</th>
              <th scope="col" className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-gold-100/50">
                <td className="px-4 py-3">
                  <p className="font-semibold">{s.nom}</p>
                  <p className="text-xs text-ink-muted">{s.formation}{s.annee && <> · {s.annee}</>}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="whitespace-nowrap">
                    {formatDate(s.dateDebut)} → {formatDate(s.dateFin)}
                  </p>
                  <p className="text-xs text-ink-muted">{s.horaires ?? "Horaires à définir"}</p>
                </td>
                <td className="px-4 py-3">
                  {s.formateur ?? <span className="text-ink-muted">À définir</span>}
                </td>
                <td className="px-4 py-3">
                  <Places inscrits={s.inscrits} capacite={s.capacite} />
                </td>
                <td className="px-4 py-3">
                  <Statut debut={s.dateDebut} fin={s.dateFin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <ul className="space-y-3 md:hidden">
        {sessions.map((s) => (
          <li key={s.id} className="rounded-lg border border-border bg-surface-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{s.nom}</p>
                <p className="text-xs text-ink-muted">{s.formation}{s.annee && <> · {s.annee}</>}</p>
              </div>
              <Statut debut={s.dateDebut} fin={s.dateFin} />
            </div>
            <p className="mt-3 text-sm">
              {formatDate(s.dateDebut)} → {formatDate(s.dateFin)}
            </p>
            <p className="text-xs text-ink-muted">
              {s.horaires ?? "Horaires à définir"} · {s.formateur ?? "Formateur à définir"}
            </p>
            <div className="mt-3">
              <Places inscrits={s.inscrits} capacite={s.capacite} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
