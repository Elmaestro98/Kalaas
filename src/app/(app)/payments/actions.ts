"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { prochainNumeroRecu } from "@/lib/recus";
import {
  peutAnnulerPaiement,
  referenceObligatoire,
  repartirPaiement,
} from "@/lib/paiements";

const MONTANT_MAX = 100_000_000;

function estDoublonReference(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
    return false;
  }
  return JSON.stringify(e.meta?.target ?? "").includes("reference");
}

// ─── Enregistrer un paiement ───────────────────────

const schemaPaiement = z
  .object({
    apprenantId: z.string().min(1),
    montant: z.coerce
      .number()
      .int("Montant sans virgule.")
      .min(1, "Indiquez le montant reçu.")
      .max(MONTANT_MAX, "Montant trop élevé, vérifiez le nombre de zéros."),
    mode: z.enum(["ESPECES", "WAVE", "ORANGE_MONEY", "VIREMENT"], "Choisissez le moyen de paiement."),
    reference: z.string().trim().max(60, "60 caractères maximum."),
    note: z.string().trim().max(200, "200 caractères maximum."),
  })
  .superRefine((d, ctx) => {
    if (referenceObligatoire(d.mode) && d.reference.length < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["reference"],
        message: "Indiquez la référence de la transaction (reçue par SMS).",
      });
    }
  });

export type ChampPaiement = "montant" | "mode" | "reference" | "note";

export type EtatPaiement = {
  erreurs: Partial<Record<ChampPaiement, string>>;
  erreurGenerale: string | null;
};

export async function enregistrerPaiement(
  _etat: EtatPaiement,
  formData: FormData,
): Promise<EtatPaiement> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaPaiement.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatPaiement["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0] && champ !== "apprenantId") {
        erreurs[champ as ChampPaiement] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: fieldErrors.apprenantId ? "Apprenant manquant." : null };
  }
  const d = resultat.data;

  const apprenant = await db.apprenant.findFirst({ where: { id: d.apprenantId } });
  if (!apprenant) {
    return { erreurs: {}, erreurGenerale: "Apprenant introuvable." };
  }

  const reference = referenceObligatoire(d.mode) ? d.reference.toUpperCase() : null;
  const maintenant = new Date();

  let paiementId: string;
  try {
    paiementId = await db.$transaction(async (tx) => {
      // Échéances encore dues, la plus ancienne d'abord (relues dans la transaction)
      const echeances = await tx.echeance.findMany({
        where: {
          statut: { not: "ANNULEE" },
          inscription: { apprenantId: apprenant.id, statut: { in: ["ACTIVE", "TERMINEE"] } },
        },
        orderBy: [{ dateLimite: "asc" }, { ordre: "asc" }],
      });
      const ouvertes = echeances
        .map((e) => ({ ...e, reste: e.montantDu - e.montantPaye }))
        .filter((e) => e.reste > 0);

      const { affectations, nonAffecte } = repartirPaiement(ouvertes, d.montant);
      if (affectations.length === 0) {
        throw new Error("RIEN_A_PAYER");
      }
      if (nonAffecte > 0) {
        throw new Error("TROP_PERCU");
      }

      const numeroRecu = await prochainNumeroRecu(tx, institut.id, maintenant.getFullYear());

      const paiement = await tx.paiement.create({
        data: {
          institutId: institut.id,
          apprenantId: apprenant.id,
          caissierId: membre.id,
          numeroRecu,
          mode: d.mode,
          montant: d.montant,
          reference,
          note: d.note || null,
          date: maintenant,
        },
      });

      await tx.paiementEcheance.createMany({
        data: affectations.map((a) => ({
          institutId: institut.id,
          paiementId: paiement.id,
          echeanceId: a.echeanceId,
          montant: a.montant,
        })),
      });

      for (const a of affectations) {
        const e = ouvertes.find((o) => o.id === a.echeanceId)!;
        const nouveauPaye = e.montantPaye + a.montant;
        await tx.echeance.update({
          where: { id: e.id },
          data: {
            montantPaye: nouveauPaye,
            statut: nouveauPaye >= e.montantDu ? "PAYEE" : "PARTIEL",
          },
        });
      }

      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "PAIEMENT_ENREGISTRE",
          entite: "Paiement",
          entiteId: paiement.id,
          apres: {
            numeroRecu,
            apprenant: `${apprenant.prenom} ${apprenant.nom}`,
            montant: d.montant,
            mode: d.mode,
            reference,
            affectations,
          },
        },
      });

      return paiement.id;
    });
  } catch (e) {
    if (estDoublonReference(e)) {
      return {
        erreurs: { reference: "Cette référence de transaction a déjà été enregistrée." },
        erreurGenerale: null,
      };
    }
    if (e instanceof Error && e.message === "TROP_PERCU") {
      return {
        erreurs: { montant: "Le montant dépasse ce que l'apprenant doit encore." },
        erreurGenerale: null,
      };
    }
    if (e instanceof Error && e.message === "RIEN_A_PAYER") {
      return { erreurs: {}, erreurGenerale: "Cet apprenant n'a plus rien à payer." };
    }
    return {
      erreurs: {},
      erreurGenerale: "L'encaissement a échoué. Aucun montant n'a été enregistré, réessayez.",
    };
  }

  revalidatePath("/payments");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect(`/payments/${paiementId}?nouveau=1`);
}

// ─── Annuler un paiement (jamais de suppression) ───

const schemaAnnulation = z.object({
  paiementId: z.string().min(1),
  motif: z
    .string()
    .trim()
    .min(3, "Expliquez pourquoi ce paiement est annulé.")
    .max(200, "200 caractères maximum."),
});

export type EtatAnnulation = { erreur: string | null };

export async function annulerPaiement(
  _etat: EtatAnnulation,
  formData: FormData,
): Promise<EtatAnnulation> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaAnnulation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message };
  }
  const { paiementId, motif } = resultat.data;

  const paiement = await db.paiement.findFirst({
    where: { id: paiementId },
    include: { repartitions: true, annulation: true },
  });
  if (!paiement) {
    return { erreur: "Paiement introuvable." };
  }
  if (paiement.annulation) {
    return { erreur: "Ce paiement est déjà annulé." };
  }
  if (!peutAnnulerPaiement(membre, paiement)) {
    return {
      erreur: "Seul le directeur peut annuler ce paiement (le caissier dispose de 10 minutes).",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.annulation.create({
        data: {
          institutId: institut.id,
          paiementId: paiement.id,
          auteurId: membre.id,
          motif,
        },
      });

      // Écriture inverse : on retire le montant des échéances réglées
      for (const r of paiement.repartitions) {
        const e = await tx.echeance.findFirst({ where: { id: r.echeanceId } });
        if (!e) {
          continue;
        }
        const nouveauPaye = Math.max(0, e.montantPaye - r.montant);
        await tx.echeance.update({
          where: { id: e.id },
          data: {
            montantPaye: nouveauPaye,
            statut: nouveauPaye === 0 ? "A_PAYER" : nouveauPaye >= e.montantDu ? "PAYEE" : "PARTIEL",
          },
        });
      }

      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "PAIEMENT_ANNULE",
          entite: "Paiement",
          entiteId: paiement.id,
          avant: { numeroRecu: paiement.numeroRecu, montant: paiement.montant, mode: paiement.mode },
          apres: { motif },
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erreur: "Ce paiement est déjà annulé." };
    }
    return { erreur: "L'annulation a échoué. Réessayez dans un instant." };
  }

  revalidatePath(`/payments/${paiement.id}`);
  revalidatePath("/payments");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { erreur: null };
}
