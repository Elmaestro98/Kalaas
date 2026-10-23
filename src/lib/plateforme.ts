import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigerSuperAdmin } from "@/lib/tenant";

// Tableau de bord de la plateforme (super administrateur) : tous les établissements à la fois.
// Toutes les requêtes ici utilisent le client non filtré : ne jamais les appeler hors de /admin.

export const PERIODES_PLATEFORME = {
  "30j": { label: "30 derniers jours", jours: 30, pas: "day" },
  "90j": { label: "90 derniers jours", jours: 90, pas: "week" },
  "12m": { label: "12 derniers mois", jours: 365, pas: "month" },
} as const;

export type PeriodePlateforme = keyof typeof PERIODES_PLATEFORME;
type Pas = (typeof PERIODES_PLATEFORME)[PeriodePlateforme]["pas"];

// Fonctions de Kalaas suivies, dans l'ordre d'affichage
export const MODULES = {
  encaissements: "Encaissements",
  inscriptions: "Inscriptions",
  notes: "Saisies de notes",
  presences: "Appels de présence",
  bulletins: "Appréciations et compétences",
  documents: "Documents délivrés",
  depenses: "Dépenses",
  relances: "Relances",
  emplois: "Créneaux d'emploi du temps",
  vacations: "Paie des vacataires",
} as const;

export type Module = keyof typeof MODULES;

export type Point = { debut: string; valeur: number }; // début de l'intervalle (AAAA-MM-JJ)

export type LigneEtablissement = {
  id: string;
  nom: string;
  type: string;
  ville: string | null;
  creeLe: Date;
  suspendu: boolean;
  directeur: { nom: string; email: string } | null;
  abonnement: { offre: string; statut: string; fin: Date } | null;
  membres: number;
  eleves: number; // inscriptions actives
  utilisateursActifs: number; // sur la période
  derniereActivite: Date | null;
  actions: number; // sur la période, toutes fonctions confondues
  encaisse: number; // sur la période (FCFA, hors paiements annulés)
};

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

// Début de l'intervalle contenant la date (lundi pour une semaine, 1er pour un mois), en UTC comme date_trunc
function debutIntervalle(d: Date, pas: Pas): Date {
  const j = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (pas === "week") j.setUTCDate(j.getUTCDate() - ((j.getUTCDay() + 6) % 7));
  if (pas === "month") j.setUTCDate(1);
  return j;
}

function suivant(d: Date, pas: Pas): Date {
  const n = new Date(d);
  if (pas === "day") n.setUTCDate(n.getUTCDate() + 1);
  if (pas === "week") n.setUTCDate(n.getUTCDate() + 7);
  if (pas === "month") n.setUTCMonth(n.getUTCMonth() + 1);
  return n;
}

// Série complète (les intervalles sans donnée valent 0)
function serie(lignes: { debut: Date; valeur: bigint | number | null }[], debut: Date, fin: Date, pas: Pas): Point[] {
  const parDebut = new Map(lignes.map((l) => [jourIso(l.debut), Number(l.valeur ?? 0)]));
  const points: Point[] = [];
  for (let d = debutIntervalle(debut, pas); d <= fin; d = suivant(d, pas)) {
    points.push({ debut: jourIso(d), valeur: parDebut.get(jourIso(d)) ?? 0 });
  }
  return points;
}

export async function chargerTableauPlateforme(periode: PeriodePlateforme) {
  await exigerSuperAdmin(); // jamais de chiffres de la plateforme sans être super administrateur
  const { jours, pas } = PERIODES_PLATEFORME[periode];
  const maintenant = new Date();
  const aujourdhui = new Date(jourIso(maintenant));
  const debut = new Date(aujourdhui.getTime() - (jours - 1) * 86_400_000);
  const unite = Prisma.raw(`'${pas}'`); // valeur fixe (day / week / month), jamais saisie par l'utilisateur

  const [actifsSerie, encaissementsSerie, inscriptionsSerie, actionsParModule, etablissements] = await Promise.all([
    prisma.$queryRaw<{ debut: Date; valeur: bigint }[]>`
      SELECT date_trunc(${unite}, "jour") AS debut, count(DISTINCT "utilisateurId") AS valeur
      FROM "ActiviteJour" WHERE "jour" >= ${debut} GROUP BY 1`,
    prisma.$queryRaw<{ debut: Date; valeur: bigint }[]>`
      SELECT date_trunc(${unite}, p."date") AS debut, sum(p."montant") AS valeur
      FROM "Paiement" p LEFT JOIN "Annulation" a ON a."paiementId" = p."id"
      WHERE a."id" IS NULL AND p."date" >= ${debut} GROUP BY 1`,
    prisma.$queryRaw<{ debut: Date; valeur: bigint }[]>`
      SELECT date_trunc(${unite}, "createdAt") AS debut, count(*) AS valeur
      FROM "Inscription" WHERE "createdAt" >= ${debut} GROUP BY 1`,
    // Nombre d'actions par établissement et par fonction sur la période
    prisma.$queryRaw<{ institutId: string; module: Module; valeur: bigint }[]>`
      SELECT "institutId", 'encaissements' AS module, count(*) AS valeur FROM "Paiement" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'inscriptions', count(*) FROM "Inscription" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'notes', count(DISTINCT "evaluationId" || ':' || "updatedAt"::date) FROM "Note" WHERE "updatedAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'presences', count(*) FROM "Seance" WHERE "appelParId" IS NOT NULL AND "date" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'bulletins', count(*) FROM (
        SELECT "institutId" FROM "AppreciationMatiere" WHERE "updatedAt" >= ${debut}
        UNION ALL SELECT "institutId" FROM "ConseilClasse" WHERE "updatedAt" >= ${debut}
        UNION ALL SELECT "institutId" FROM "AcquisitionCompetence" WHERE "updatedAt" >= ${debut}
      ) b GROUP BY 1
      UNION ALL SELECT "institutId", 'documents', count(*) FROM "DocumentDelivre" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'depenses', count(*) FROM "Depense" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'relances', count(*) FROM "Relance" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'emplois', count(*) FROM "Creneau" WHERE "createdAt" >= ${debut} GROUP BY 1
      UNION ALL SELECT "institutId", 'vacations', count(*) FROM "Vacation" WHERE "createdAt" >= ${debut} GROUP BY 1`,
    prisma.institut.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        abonnements: { orderBy: { fin: "desc" }, take: 1 },
        membres: {
          where: { actif: true },
          select: { role: true, utilisateur: { select: { nom: true, email: true } } },
        },
      },
    }),
  ]);

  const [eleves, derniereActivite, actifsParInstitut, encaisseParInstitut, utilisateursActifs, actifsAujourdhui] =
    await Promise.all([
      prisma.inscription.groupBy({ by: ["institutId"], where: { statut: "ACTIVE" }, _count: true }),
      prisma.activiteJour.groupBy({ by: ["institutId"], _max: { derniere: true } }),
      prisma.activiteJour.groupBy({ by: ["institutId", "utilisateurId"], where: { jour: { gte: debut } } }),
      prisma.paiement.groupBy({
        by: ["institutId"],
        where: { date: { gte: debut }, annulation: { is: null } },
        _sum: { montant: true },
      }),
      prisma.activiteJour.findMany({ where: { jour: { gte: debut } }, distinct: ["utilisateurId"], select: { utilisateurId: true } }),
      prisma.activiteJour.count({ where: { jour: aujourdhui } }),
    ]);

  // Totaux par fonction et par établissement
  const parModule = Object.fromEntries(Object.keys(MODULES).map((m) => [m, 0])) as Record<Module, number>;
  const actionsParInstitut = new Map<string, number>();
  for (const l of actionsParModule) {
    parModule[l.module] += Number(l.valeur);
    actionsParInstitut.set(l.institutId, (actionsParInstitut.get(l.institutId) ?? 0) + Number(l.valeur));
  }

  const lignes: LigneEtablissement[] = etablissements.map((e) => {
    const directeur = e.membres.find((m) => m.role === "DIRECTEUR")?.utilisateur ?? null;
    const abonnement = e.abonnements[0];
    return {
      id: e.id,
      nom: e.nom,
      type: e.typeEtablissement,
      ville: e.ville,
      creeLe: e.createdAt,
      suspendu: e.statut === "SUSPENDU",
      directeur,
      abonnement: abonnement ? { offre: abonnement.offre, statut: abonnement.statut, fin: abonnement.fin } : null,
      membres: e.membres.length,
      eleves: eleves.find((x) => x.institutId === e.id)?._count ?? 0,
      utilisateursActifs: actifsParInstitut.filter((x) => x.institutId === e.id).length,
      derniereActivite: derniereActivite.find((x) => x.institutId === e.id)?._max.derniere ?? null,
      actions: actionsParInstitut.get(e.id) ?? 0,
      encaisse: encaisseParInstitut.find((x) => x.institutId === e.id)?._sum.montant ?? 0,
    };
  });
  // Les plus actifs d'abord, puis par dernière activité
  lignes.sort(
    (a, b) =>
      b.actions - a.actions || (b.derniereActivite?.getTime() ?? 0) - (a.derniereActivite?.getTime() ?? 0),
  );

  const encaisse = encaissementsSerie.reduce((s, l) => s + Number(l.valeur ?? 0), 0);
  const statutsAbonnement = { ESSAI: 0, ACTIF: 0, EXPIRE: 0, ANNULE: 0, AUCUN: 0 };
  for (const l of lignes) statutsAbonnement[(l.abonnement?.statut ?? "AUCUN") as keyof typeof statutsAbonnement]++;
  const dansSeptJours = new Date(maintenant.getTime() + 7 * 86_400_000);

  return {
    debut,
    pas,
    chiffres: {
      encaisse,
      etablissements: lignes.length,
      etablissementsActifs: lignes.filter((l) => l.utilisateursActifs > 0).length,
      nouveauxEtablissements: lignes.filter((l) => l.creeLe >= debut).length,
      utilisateursActifs: utilisateursActifs.length,
      actifsAujourdhui,
      inscriptions: inscriptionsSerie.reduce((s, l) => s + Number(l.valeur), 0),
      elevesActifs: lignes.reduce((s, l) => s + l.eleves, 0),
    },
    series: {
      utilisateursActifs: serie(actifsSerie, debut, aujourdhui, pas),
      encaissements: serie(encaissementsSerie, debut, aujourdhui, pas),
      inscriptions: serie(inscriptionsSerie, debut, aujourdhui, pas),
    },
    modules: (Object.keys(MODULES) as Module[]).map((m) => ({ module: m, label: MODULES[m], valeur: parModule[m] })),
    statutsAbonnement,
    // Essais qui se terminent dans les 7 jours : établissements à relancer
    essaisBientotFinis: lignes.filter(
      (l) => l.abonnement?.statut === "ESSAI" && l.abonnement.fin >= maintenant && l.abonnement.fin <= dansSeptJours,
    ),
    etablissements: lignes,
  };
}

export type TableauPlateforme = Awaited<ReturnType<typeof chargerTableauPlateforme>>;
