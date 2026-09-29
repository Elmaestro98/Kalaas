import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { formatFcfa, formatNombre } from "@/lib/format";
import {
  STATUT_FINANCIER,
  resumeFinancier,
  statutFinancier,
  type StatutFinancier,
} from "@/lib/echeancier";
import Badge from "@/components/ui/badge";

type StudentsPageProps = {
  searchParams: Promise<{ q?: string; statut?: string }>;
};

const ONGLETS: { valeur: StatutFinancier | "TOUS"; label: string }[] = [
  { valeur: "TOUS", label: "Tous" },
  { valeur: "A_JOUR", label: "À jour" },
  { valeur: "EN_RETARD", label: "En retard" },
  { valeur: "SOLDE", label: "Soldés" },
];

function initiales(prenom: string, nom: string) {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { q = "", statut = "TOUS" } = await searchParams;
  const recherche = q.trim();

  const apprenants = await db.apprenant.findMany({
    where: recherche
      ? {
          OR: [
            { nom: { contains: recherche, mode: "insensitive" } },
            { prenom: { contains: recherche, mode: "insensitive" } },
            { matricule: { contains: recherche, mode: "insensitive" } },
            { telephone: { contains: recherche } },
          ],
        }
      : undefined,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    take: 200,
    include: {
      inscriptions: {
        where: { statut: { in: ["ACTIVE", "TERMINEE"] } },
        orderBy: { date: "desc" },
        include: {
          session: {
            select: {
              nom: true,
              formation: { select: { intitule: true } },
              anneeAcademique: { select: { libelle: true } },
            },
          },
          echeances: {
            select: { montantDu: true, montantPaye: true, dateLimite: true, statut: true },
          },
        },
      },
    },
  });

  const lignes = apprenants.map((a) => {
    const resume = resumeFinancier(a.inscriptions.flatMap((i) => i.echeances));
    return {
      id: a.id,
      prenom: a.prenom,
      nom: a.nom,
      matricule: a.matricule,
      telephone: a.telephone,
      formation: a.inscriptions[0]
        ? `${a.inscriptions[0].session.formation.intitule} · ${
            a.inscriptions[0].session.anneeAcademique?.libelle ?? a.inscriptions[0].session.nom
          }`
        : null,
      resume,
      statut: statutFinancier(resume),
    };
  });

  const compteurs = {
    TOUS: lignes.length,
    A_JOUR: lignes.filter((l) => l.statut === "A_JOUR").length,
    EN_RETARD: lignes.filter((l) => l.statut === "EN_RETARD").length,
    SOLDE: lignes.filter((l) => l.statut === "SOLDE").length,
  };
  const affichees = statut === "TOUS" ? lignes : lignes.filter((l) => l.statut === statut);

  const totalDu = lignes.reduce((s, l) => s + l.resume.total, 0);
  const totalPaye = lignes.reduce((s, l) => s + l.resume.paye, 0);
  const tauxRecouvrement = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0;

  function lienOnglet(valeur: string) {
    const params = new URLSearchParams();
    if (recherche) params.set("q", recherche);
    if (valeur !== "TOUS") params.set("statut", valeur);
    const texte = params.toString();
    return texte ? `/students?${texte}` : "/students";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">Apprenants</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {compteurs.TOUS} apprenant{compteurs.TOUS > 1 ? "s" : ""}
            {totalDu > 0 && (
              <>
                {" "}· Recouvrement <b className="text-ink">{tauxRecouvrement} %</b> · Reste dû{" "}
                <b className="text-ink">{formatFcfa(totalDu - totalPaye)}</b>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/enrollments/new?mode=reinscription"
            className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-200 px-5 font-medium text-ink hover:bg-surface-100"
          >
            Réinscrire
          </Link>
          <Link
            href="/enrollments/new"
            className="flex h-11 items-center gap-2 rounded-md bg-action px-5 font-medium text-on-action hover:bg-action-hover"
          >
            <Plus size={18} aria-hidden="true" />
            Inscrire un apprenant
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <nav aria-label="Filtrer par statut" className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface-200 p-1">
          {ONGLETS.map((o) => {
            const actif = statut === o.valeur;
            return (
              <Link
                key={o.valeur}
                href={lienOnglet(o.valeur)}
                aria-current={actif ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-sm ${
                  actif ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {o.label}
                <span className={`rounded-full px-1.5 text-xs ${actif ? "bg-white/20" : "bg-surface-100"}`}>
                  {compteurs[o.valeur]}
                </span>
              </Link>
            );
          })}
        </nav>

        <form action="/students" className="flex flex-1 items-center gap-2 lg:max-w-sm lg:ml-auto">
          {statut !== "TOUS" && <input type="hidden" name="statut" value={statut} />}
          <label className="flex h-11 flex-1 items-center gap-2 rounded-md border border-border bg-surface-200 px-3 text-ink-muted focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-100">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={recherche}
              placeholder="Nom, matricule ou téléphone"
              aria-label="Rechercher un apprenant"
              className="h-full flex-1 bg-transparent text-ink outline-none"
            />
          </label>
        </form>
      </div>

      {affichees.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-200 p-10 text-center">
          <p className="font-semibold">
            {compteurs.TOUS === 0 && !recherche ? "Aucun apprenant pour l'instant" : "Aucun apprenant trouvé"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {compteurs.TOUS === 0 && !recherche
              ? "Inscrivez votre premier apprenant : son échéancier sera créé automatiquement."
              : "Essayez un autre nom, un autre numéro ou un autre filtre."}
          </p>
        </div>
      ) : (
        <>
          {/* Ordinateur : tableau */}
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-border bg-surface-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-100 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Apprenant</th>
                  <th scope="col" className="px-4 py-3">Formation</th>
                  <th scope="col" className="px-4 py-3 text-right">Payé</th>
                  <th scope="col" className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affichees.map((l) => {
                  const pourcentage = l.resume.total > 0 ? Math.round((l.resume.paye / l.resume.total) * 100) : 0;
                  return (
                    <tr key={l.id} className="hover:bg-gold-100/50">
                      <td className="px-4 py-3">
                        <Link href={`/students/${l.id}`} className="flex items-center gap-3 text-ink">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-gold-500">
                            {initiales(l.prenom, l.nom)}
                          </span>
                          <span>
                            <span className="block font-semibold">
                              {l.prenom} {l.nom}
                            </span>
                            <span className="text-xs text-ink-muted">
                              {l.matricule && <span className="font-mono">{l.matricule} · </span>}
                              {l.telephone}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">{l.formation ?? <span className="text-ink-muted">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="tabular-nums">
                          <b className="font-semibold">{formatNombre(l.resume.paye)}</b>
                          <span className="text-ink-muted"> / {formatNombre(l.resume.total)}</span>
                        </p>
                        <div className="mt-1.5 ml-auto h-1.5 w-28 rounded-full bg-surface-100">
                          <div className="h-1.5 rounded-full bg-navy-900" style={{ width: `${pourcentage}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge ton={STATUT_FINANCIER[l.statut].ton}>{STATUT_FINANCIER[l.statut].label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : cartes */}
          <ul className="mt-4 space-y-3 md:hidden">
            {affichees.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/students/${l.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-200 p-4 text-ink"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
                    {initiales(l.prenom, l.nom)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {l.prenom} {l.nom}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{l.formation ?? l.telephone}</span>
                    <span className="mt-1 block text-xs tabular-nums text-ink-muted">
                      {formatNombre(l.resume.paye)} / {formatNombre(l.resume.total)} FCFA
                    </span>
                  </span>
                  <Badge ton={STATUT_FINANCIER[l.statut].ton}>{STATUT_FINANCIER[l.statut].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
