import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { exigerRole } from "@/lib/tenant";
import { dateDuJour } from "@/lib/echeancier";
import { codeNiveau, niveauSuivant } from "@/lib/lmd";
import EnrollmentForm, { type ApprenantExistant, type OptionSession } from "./enrollment-form";

type NewEnrollmentPageProps = {
  searchParams: Promise<{ session?: string; apprenant?: string; mode?: string; q?: string }>;
};

function Onglets({ reinscription }: { reinscription: boolean }) {
  const classe = (actif: boolean) =>
    `flex h-9 items-center rounded-sm px-4 text-sm ${
      actif ? "bg-navy-900 font-semibold text-white" : "text-ink-muted hover:text-ink"
    }`;
  return (
    <nav aria-label="Type d'apprenant" className="mb-6 inline-flex gap-1 rounded-md border border-border bg-surface-200 p-1">
      <Link href="/enrollments/new" aria-current={!reinscription ? "page" : undefined} className={classe(!reinscription)}>
        Nouvel apprenant
      </Link>
      <Link
        href="/enrollments/new?mode=reinscription"
        aria-current={reinscription ? "page" : undefined}
        className={classe(reinscription)}
      >
        Réinscription
      </Link>
    </nav>
  );
}

export default async function NewEnrollmentPage({ searchParams }: NewEnrollmentPageProps) {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { session: sessionDemandee, apprenant: apprenantId, mode, q = "" } = await searchParams;
  const reinscription = mode === "reinscription" || Boolean(apprenantId);

  const entete = (
    <>
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Apprenants
      </Link>
      <h1 className="mt-3 text-2xl font-semibold lg:text-3xl">
        {reinscription ? "Réinscription" : "Nouvelle inscription"}
      </h1>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        {reinscription
          ? "Inscrivez un apprenant existant pour une nouvelle année ou une autre formation. Son matricule est conservé."
          : "Un matricule est attribué et l'échéancier est généré automatiquement."}
      </p>
      <Onglets reinscription={reinscription} />
    </>
  );

  // ─── Réinscription, étape 1 : trouver l'apprenant ───
  if (reinscription && !apprenantId) {
    const recherche = q.trim();
    const apprenants = recherche
      ? await db.apprenant.findMany({
          where: {
            OR: [
              { nom: { contains: recherche, mode: "insensitive" } },
              { prenom: { contains: recherche, mode: "insensitive" } },
              { matricule: { contains: recherche, mode: "insensitive" } },
              { telephone: { contains: recherche } },
            ],
          },
          orderBy: [{ nom: "asc" }, { prenom: "asc" }],
          take: 30,
          include: {
            inscriptions: {
              orderBy: { date: "desc" },
              take: 1,
              include: {
                session: {
                  select: { formation: { select: { intitule: true } }, anneeAcademique: { select: { libelle: true } } },
                },
              },
            },
          },
        })
      : [];

    return (
      <div className="mx-auto max-w-2xl">
        {entete}
        <form action="/enrollments/new">
          <input type="hidden" name="mode" value="reinscription" />
          <label className="flex h-12 items-center gap-2 rounded-md border border-border bg-surface-200 px-3 text-ink-muted focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-100">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={recherche}
              autoFocus
              placeholder="Nom, matricule ou téléphone"
              aria-label="Rechercher un apprenant"
              className="h-full flex-1 bg-transparent text-ink outline-none"
            />
          </label>
        </form>

        {recherche &&
          (apprenants.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-surface-200 p-6 text-center text-sm text-ink-muted">
              Aucun apprenant trouvé.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-200">
              {apprenants.map((a) => {
                const derniere = a.inscriptions[0];
                return (
                  <li key={a.id}>
                    <Link
                      href={`/enrollments/new?apprenant=${a.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-ink hover:bg-gold-100/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
                        {`${a.prenom[0] ?? ""}${a.nom[0] ?? ""}`.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {a.prenom} {a.nom}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {a.matricule ?? a.telephone}
                          {derniere && (
                            <>
                              {" "}· {derniere.session.formation.intitule}
                              {derniere.session.anneeAcademique && ` · ${derniere.session.anneeAcademique.libelle}`}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-gold-700">Choisir →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>
    );
  }

  // ─── Sessions ouvertes ───
  const sessions = await db.session.findMany({
    where: { dateFin: { gte: dateDuJour() }, formation: { active: true } },
    orderBy: [{ dateDebut: "asc" }],
    include: {
      formation: {
        select: {
          intitule: true,
          cycle: true,
          filiere: true,
          niveau: true,
          fraisInscription: true,
          prixTotal: true,
          nbMensualites: true,
        },
      },
      anneeAcademique: { select: { libelle: true, enCours: true } },
      _count: { select: { inscriptions: { where: { statut: "ACTIVE" } } } },
    },
  });

  const options: OptionSession[] = sessions.map((s) => ({
    id: s.id,
    nom: s.nom,
    formation: s.formation.intitule,
    annee: s.anneeAcademique?.libelle ?? null,
    dateDebut: s.dateDebut.toISOString(),
    horaires: s.horaires,
    capacite: s.capacite,
    inscrits: s._count.inscriptions,
    fraisInscription: s.formation.fraisInscription,
    prixTotal: s.formation.prixTotal,
    nbMensualites: s.formation.nbMensualites,
  }));

  // ─── Réinscription, étape 2 : l'apprenant est choisi ───
  let apprenant: ApprenantExistant | undefined;
  let sessionSuggeree: string | undefined;
  let typeSuggere: "REINSCRIPTION" | "REDOUBLEMENT" | "NOUVELLE" | undefined;

  if (apprenantId) {
    const a = await db.apprenant.findFirst({
      where: { id: apprenantId },
      include: {
        inscriptions: {
          orderBy: { date: "desc" },
          take: 1,
          include: {
            session: {
              include: {
                formation: { select: { intitule: true, cycle: true, filiere: true, niveau: true } },
                anneeAcademique: { select: { libelle: true } },
              },
            },
          },
        },
      },
    });
    if (!a) {
      notFound();
    }

    const derniere = a.inscriptions[0];
    apprenant = {
      id: a.id,
      nom: `${a.prenom} ${a.nom}`,
      matricule: a.matricule,
      telephone: a.telephone,
      parcours: derniere
        ? `${derniere.session.formation.intitule}${
            derniere.session.anneeAcademique ? ` · ${derniere.session.anneeAcademique.libelle}` : ""
          }`
        : null,
    };

    // Suggestion : le niveau suivant de la même filière, dans l'année en cours
    const f = derniere?.session.formation;
    if (f && f.cycle !== "FORMATION_COURTE") {
      apprenant.parcours = `${apprenant.parcours} (${codeNiveau(f.cycle, f.niveau)})`;
      const suivant = niveauSuivant(f.cycle, f.niveau);
      if (suivant) {
        typeSuggere = "REINSCRIPTION";
        sessionSuggeree = sessions.find(
          (s) =>
            s.formation.cycle === f.cycle &&
            s.formation.filiere?.toLowerCase() === f.filiere?.toLowerCase() &&
            s.formation.niveau === suivant &&
            s.anneeAcademique?.enCours,
        )?.id;
      } else {
        // Fin de cycle (ex. L3) : l'étudiant change de cycle (Master) → nouvelle inscription
        typeSuggere = "NOUVELLE";
      }
    } else if (derniere) {
      typeSuggere = "NOUVELLE";
    }
  }

  const sessionInitiale = options.some((o) => o.id === sessionDemandee) ? sessionDemandee : sessionSuggeree;

  return (
    <div className="mx-auto max-w-6xl">
      {entete}

      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-200 p-8 text-center">
          <p className="font-semibold">Aucune session ouverte</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ouvrez une session (ou une promotion pour l&apos;année académique) depuis le catalogue des formations.
          </p>
          <Link href="/courses" className="mt-3 inline-block text-sm font-semibold">
            Voir les formations →
          </Link>
        </div>
      ) : (
        <EnrollmentForm
          key={apprenant?.id ?? "nouveau"}
          sessions={options}
          sessionInitiale={sessionInitiale}
          apprenant={apprenant}
          typeInitial={typeSuggere}
        />
      )}
    </div>
  );
}
