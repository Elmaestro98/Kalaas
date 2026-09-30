import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { dateDuJour } from "@/lib/echeancier";
import { formatDate, formatFcfa } from "@/lib/format";
import {
  MODELES_PAR_DEFAUT,
  declencheurDuJour,
  joursDeRetard,
  rendreMessage,
  type Declencheur,
} from "@/lib/relances";

const JOUR_MS = 86_400_000;

type ApprenantRelance = {
  id: string;
  prenom: string;
  nom: string;
  matricule: string | null;
  telephone: string;
  tuteurNom: string | null;
  tuteurTelephone: string | null;
};

type EcheanceRelance = {
  id: string;
  libelle: string;
  dateLimite: Date;
  reste: number;
  jours: number;
};

export type DossierImpaye = {
  apprenant: ApprenantRelance;
  formation: string;
  echeances: EcheanceRelance[];
  montant: number;
  joursMax: number;
  derniereRelance: Date | null;
};

export type RelanceDuJour = {
  apprenant: ApprenantRelance;
  formation: string;
  declencheur: Declencheur;
  echeance: EcheanceRelance;
};

const SELECTION = {
  inscription: {
    select: {
      apprenant: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          matricule: true,
          telephone: true,
          tuteurNom: true,
          tuteurTelephone: true,
        },
      },
      session: { select: { formation: { select: { intitule: true } } } },
    },
  },
} as const;

const EN_COURS = { statut: { in: ["ACTIVE" as const, "TERMINEE" as const] } };

// Tous les apprenants avec au moins une échéance en retard, du plus en retard au moins en retard
export async function chargerImpayes(db: DbInstitut): Promise<DossierImpaye[]> {
  const aujourdhui = dateDuJour();

  const echeances = await db.echeance.findMany({
    where: {
      statut: { in: ["A_PAYER", "PARTIEL"] },
      dateLimite: { lt: aujourdhui },
      inscription: EN_COURS,
    },
    orderBy: { dateLimite: "asc" },
    include: {
      ...SELECTION,
      relances: { where: { statut: "ENVOYEE" }, orderBy: { envoyeeLe: "desc" }, take: 1 },
    },
  });

  const dossiers = new Map<string, DossierImpaye>();
  for (const e of echeances) {
    const reste = e.montantDu - e.montantPaye;
    if (reste <= 0) continue;

    const a = e.inscription.apprenant;
    const jours = joursDeRetard(e.dateLimite, aujourdhui);
    const dossier = dossiers.get(a.id) ?? {
      apprenant: a,
      formation: e.inscription.session.formation.intitule,
      echeances: [],
      montant: 0,
      joursMax: 0,
      derniereRelance: null,
    };

    dossier.echeances.push({ id: e.id, libelle: e.libelle, dateLimite: e.dateLimite, reste, jours });
    dossier.montant += reste;
    dossier.joursMax = Math.max(dossier.joursMax, jours);
    const relance = e.relances[0]?.envoyeeLe ?? null;
    if (relance && (!dossier.derniereRelance || relance > dossier.derniereRelance)) {
      dossier.derniereRelance = relance;
    }
    dossiers.set(a.id, dossier);
  }

  return [...dossiers.values()].sort((x, y) => y.joursMax - x.joursMax || y.montant - x.montant);
}

// Échéances à relancer aujourd'hui (J-3, J+1, J+7) qui ne l'ont pas encore été pour ce moment
export async function chargerRelancesDuJour(db: DbInstitut): Promise<RelanceDuJour[]> {
  const aujourdhui = dateDuJour();
  const dates = [3, -1, -7].map((decalage) => new Date(aujourdhui.getTime() + decalage * JOUR_MS));

  const echeances = await db.echeance.findMany({
    where: {
      statut: { in: ["A_PAYER", "PARTIEL"] },
      dateLimite: { in: dates },
      inscription: EN_COURS,
    },
    orderBy: { dateLimite: "asc" },
    include: { ...SELECTION, relances: { select: { declencheur: true } } },
  });

  const resultat: RelanceDuJour[] = [];
  for (const e of echeances) {
    const declencheur = declencheurDuJour(e.dateLimite, aujourdhui);
    const reste = e.montantDu - e.montantPaye;
    if (!declencheur || reste <= 0) continue;
    if (e.relances.some((r) => r.declencheur === declencheur)) continue; // déjà faite

    resultat.push({
      apprenant: e.inscription.apprenant,
      formation: e.inscription.session.formation.intitule,
      declencheur,
      echeance: {
        id: e.id,
        libelle: e.libelle,
        dateLimite: e.dateLimite,
        reste,
        jours: joursDeRetard(e.dateLimite, aujourdhui),
      },
    });
  }
  return resultat;
}

// Modèles de l'établissement, complétés par les modèles par défaut
export async function chargerModeles(db: DbInstitut): Promise<Record<Declencheur, string>> {
  const enregistres = await db.modeleRelance.findMany({ where: { canal: "WHATSAPP", actif: true } });
  const modeles = { ...MODELES_PAR_DEFAUT };
  for (const m of enregistres) {
    modeles[m.declencheur] = m.contenu;
  }
  return modeles;
}

export function messagePourDossier(modele: string, d: DossierImpaye, etablissement: string): string {
  const plusAncienne = d.echeances[0];
  return rendreMessage(modele, {
    prenom: d.apprenant.prenom,
    nom: d.apprenant.nom,
    montant: formatFcfa(d.montant),
    echeance: plusAncienne?.libelle ?? "",
    echeances: d.echeances.map((e) => e.libelle).join(", "),
    date: plusAncienne ? formatDate(plusAncienne.dateLimite) : "",
    jours: String(d.joursMax),
    formation: d.formation,
    etablissement,
  });
}

export function messagePourRelance(modele: string, r: RelanceDuJour, etablissement: string): string {
  return rendreMessage(modele, {
    prenom: r.apprenant.prenom,
    nom: r.apprenant.nom,
    montant: formatFcfa(r.echeance.reste),
    echeance: r.echeance.libelle,
    echeances: r.echeance.libelle,
    date: formatDate(r.echeance.dateLimite),
    jours: String(Math.max(0, r.echeance.jours)),
    formation: r.formation,
    etablissement,
  });
}
