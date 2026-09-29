import { exigerRole } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { prefixeParDefaut } from "@/lib/lmd";
import Badge from "@/components/ui/badge";
import { definirAnneeEnCours } from "./actions";
import AcademicYearForm from "./academic-year-form";
import PrefixForm from "./prefix-form";

export default async function SettingsPage() {
  const { institut, db } = await exigerRole("DIRECTEUR");

  const annees = await db.anneeAcademique.findMany({
    orderBy: { dateDebut: "desc" },
    include: { _count: { select: { sessions: true } } },
  });

  const maintenant = new Date();
  const anneeScolaire = maintenant.getMonth() >= 7 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  const anneeProposee = annees.length > 0
    ? Math.max(...annees.map((a) => a.dateDebut.getUTCFullYear())) + 1
    : anneeScolaire;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold lg:text-3xl">Paramètres</h1>
      <p className="mt-1 text-sm text-ink-muted">{institut.nom}</p>

      <section className="mt-6 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
        <h2 className="font-semibold">Années académiques</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pour les formations LMD (Licence, Master, Doctorat). L&apos;année « en cours » est proposée par
          défaut lors des inscriptions et des réinscriptions.
        </p>

        {annees.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {annees.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-24 font-semibold">{a.libelle}</span>
                <span className="flex-1 text-ink-muted">
                  {formatDate(a.dateDebut)} → {formatDate(a.dateFin)} · {a._count.sessions} session
                  {a._count.sessions > 1 ? "s" : ""}
                </span>
                {a.enCours ? (
                  <Badge ton="success">En cours</Badge>
                ) : (
                  <form action={definirAnneeEnCours}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="cursor-pointer text-sm font-semibold text-gold-700 hover:underline">
                      Définir comme année en cours
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {/* key : le formulaire repart à zéro (année suivante proposée) après chaque ajout */}
          <AcademicYearForm
            key={anneeProposee}
            anneeProposee={anneeProposee}
            premiereAnnee={annees.length === 0}
          />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface-200 p-5 lg:p-6">
        <h2 className="font-semibold">Matricules</h2>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          Chaque apprenant reçoit un matricule unique à sa première inscription, conservé pendant toute sa
          scolarité. Il est composé du préfixe, de l&apos;année d&apos;entrée et d&apos;un numéro.
        </p>
        <PrefixForm prefixeActuel={institut.prefixeMatricule ?? prefixeParDefaut(institut.nom)} />
      </section>
    </div>
  );
}
