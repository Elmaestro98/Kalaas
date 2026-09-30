import "server-only";
import type { DbInstitut } from "@/lib/prisma";
import { resumeFinancier, type ResumeFinancier } from "@/lib/echeancier";
import type { ModePaiementSaisie } from "@/lib/paiements";

export type Recu = {
  numero: string;
  date: Date;
  montant: number;
  mode: ModePaiementSaisie;
  reference: string | null;
  caissier: string | null;
  apprenant: { prenom: string; nom: string; telephone: string; matricule: string | null };
  formation: { intitule: string; session: string } | null;
  lignes: { libelle: string; dateLimite: Date; montant: number; partiel: boolean }[];
  situation: ResumeFinancier;
  annulation: { date: Date; motif: string } | null;
};

// Toutes les données d'un reçu (pour le PDF), filtrées par établissement via db
export async function chargerRecu(db: DbInstitut, id: string): Promise<Recu | null> {
  const paiement = await db.paiement.findFirst({
    where: { id },
    include: {
      apprenant: { select: { prenom: true, nom: true, telephone: true, matricule: true } },
      caissier: { select: { utilisateur: { select: { nom: true } } } },
      annulation: { select: { date: true, motif: true } },
      repartitions: {
        include: {
          echeance: {
            select: {
              libelle: true,
              dateLimite: true,
              ordre: true,
              montantDu: true,
              inscription: {
                select: { session: { select: { nom: true, formation: { select: { intitule: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!paiement) {
    return null;
  }

  const echeances = await db.echeance.findMany({
    where: { inscription: { apprenantId: paiement.apprenantId, statut: { in: ["ACTIVE", "TERMINEE"] } } },
    select: { montantDu: true, montantPaye: true, dateLimite: true, statut: true },
  });

  const lignes = [...paiement.repartitions].sort(
    (a, b) => a.echeance.dateLimite.getTime() - b.echeance.dateLimite.getTime() || a.echeance.ordre - b.echeance.ordre,
  );
  const session = lignes[0]?.echeance.inscription.session;

  return {
    numero: paiement.numeroRecu,
    date: paiement.date,
    montant: paiement.montant,
    mode: paiement.mode,
    reference: paiement.reference,
    caissier: paiement.caissier?.utilisateur.nom ?? null,
    apprenant: paiement.apprenant,
    formation: session ? { intitule: session.formation.intitule, session: session.nom } : null,
    lignes: lignes.map((l) => ({
      libelle: l.echeance.libelle,
      dateLimite: l.echeance.dateLimite,
      montant: l.montant,
      partiel: l.montant < l.echeance.montantDu,
    })),
    situation: resumeFinancier(echeances),
    annulation: paiement.annulation,
  };
}
