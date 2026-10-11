"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { flash } from "@/lib/flash";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { etatDesHeures, lireMois } from "@/lib/heures-donnees";
import { prochainNumeroVacation } from "@/lib/paie-donnees";
import { calculerBrut, estMois, lireAjustement, type LigneDetailVacation } from "@/lib/paie";
import { referenceObligatoire } from "@/lib/paiements";
import { caisseCloturee } from "@/lib/caisse";
import { dateDuJour } from "@/lib/echeancier";

// ─── Valider le bulletin d'un vacataire pour un mois ───

export type EtatValidation = {
  erreurs: { ajustement?: string; motif?: string };
  erreurGenerale: string | null;
};

export async function validerVacation(_etat: EtatValidation, formData: FormData): Promise<EtatValidation> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");

  const enseignantId = String(formData.get("enseignantId") ?? "");
  const mois = String(formData.get("mois") ?? "");
  const ajustement = lireAjustement(String(formData.get("ajustement") ?? ""));
  const motif = String(formData.get("motif") ?? "").trim();

  if (!estMois(mois) || mois > lireMois(undefined).cle) {
    return { erreurs: {}, erreurGenerale: "Mois invalide : on ne valide pas un mois à venir." };
  }
  if (ajustement === null) {
    return { erreurs: { ajustement: "Montant invalide. Exemple : -20000 ou 5000." }, erreurGenerale: null };
  }
  if (ajustement !== 0 && motif.length < 3) {
    return { erreurs: { motif: "Expliquez la retenue ou la prime." }, erreurGenerale: null };
  }
  if (motif.length > 200) {
    return { erreurs: { motif: "200 caractères maximum." }, erreurGenerale: null };
  }

  // Les heures sont recalculées ici, côté serveur : on ne fait jamais confiance au formulaire
  const { debut, fin } = lireMois(mois);
  const ligne = (await etatDesHeures(db, debut, fin)).find((l) => l.enseignantId === enseignantId);
  if (!ligne || ligne.statut !== "VACATAIRE") {
    return { erreurs: {}, erreurGenerale: "Vacataire introuvable." };
  }
  if (!ligne.tarifHoraire) {
    return { erreurs: {}, erreurGenerale: "Ce professeur n'a pas de tarif horaire : renseignez-le sur sa fiche." };
  }
  if (ligne.minutes <= 0) {
    return { erreurs: {}, erreurGenerale: "Aucune heure faite ce mois-ci." };
  }

  const montantBrut = calculerBrut(ligne.minutes, ligne.tarifHoraire);
  const montantNet = montantBrut + ajustement;
  if (montantNet < 0) {
    return { erreurs: { ajustement: "La retenue dépasse le montant brut." }, erreurGenerale: null };
  }

  const detail: LigneDetailVacation[] = ligne.detail.map((d) => ({
    classe: d.classe,
    matiere: d.matiere,
    minutes: d.minutes,
  }));

  let vacationId: string;
  try {
    vacationId = await db.$transaction(async (tx) => {
      const numero = await prochainNumeroVacation(tx, institut.id, Number(mois.slice(0, 4)));

      const vacation = await tx.vacation.create({
        data: {
          institutId: institut.id,
          enseignantId,
          mois,
          numero,
          minutes: ligne.minutes,
          tarifHoraire: ligne.tarifHoraire!,
          montantBrut,
          ajustement,
          motifAjustement: ajustement !== 0 ? motif : null,
          montantNet,
          detail,
          valideeParId: membre.id,
        },
      });

      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "VACATION_VALIDEE",
          entite: "Vacation",
          entiteId: vacation.id,
          apres: { numero, enseignant: ligne.nom, mois, minutes: ligne.minutes, montantBrut, ajustement, montantNet },
        },
      });

      return vacation.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erreurs: {}, erreurGenerale: "Le bulletin de ce mois est déjà validé." };
    }
    return { erreurs: {}, erreurGenerale: "La validation a échoué. Réessayez dans un instant." };
  }

  revalidatePath("/payroll");
  redirect(`/payroll/${vacationId}?nouveau=1`);
}

// ─── Marquer un bulletin comme payé ───

const schemaPaiementVacation = z
  .object({
    vacationId: z.string().min(1),
    mode: z.enum(["ESPECES", "WAVE", "ORANGE_MONEY", "VIREMENT"], "Choisissez le moyen de paiement."),
    reference: z.string().trim().max(60, "60 caractères maximum."),
  })
  .superRefine((d, ctx) => {
    if (referenceObligatoire(d.mode) && d.reference.length < 4) {
      ctx.addIssue({ code: "custom", path: ["reference"], message: "Indiquez la référence de la transaction." });
    }
  });

export type EtatPaiementVacation = { erreur: string | null };

export async function payerVacation(_etat: EtatPaiementVacation, formData: FormData): Promise<EtatPaiementVacation> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaPaiementVacation.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    return { erreur: resultat.error.issues[0].message };
  }
  const { vacationId, mode, reference } = resultat.data;

  const vacation = await db.vacation.findFirst({ where: { id: vacationId } });
  if (!vacation) {
    return { erreur: "Bulletin introuvable." };
  }
  if (mode === "ESPECES" && (await caisseCloturee(db, membre.id, dateDuJour()))) {
    return { erreur: "Votre caisse est clôturée pour aujourd'hui : payez en Wave, Orange Money ou virement." };
  }

  // updateMany + statut VALIDEE : si deux personnes cliquent en même temps, un seul paiement passe
  const { count } = await db.$transaction(async (tx) => {
    const maj = await tx.vacation.updateMany({
      where: { id: vacation.id, statut: "VALIDEE" },
      data: {
        statut: "PAYEE",
        modePaiement: mode,
        referencePaiement: referenceObligatoire(mode) ? reference.toUpperCase() : null,
        payeeLe: new Date(),
        payeeParId: membre.id,
      },
    });
    if (maj.count === 1) {
      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: "VACATION_PAYEE",
          entite: "Vacation",
          entiteId: vacation.id,
          apres: { numero: vacation.numero, montantNet: vacation.montantNet, mode },
        },
      });
    }
    return maj;
  });
  if (count === 0) {
    return { erreur: "Ce bulletin est déjà payé." };
  }

  await flash("Bulletin marqué comme payé.");
  revalidatePath(`/payroll/${vacation.id}`);
  revalidatePath("/payroll");
  return { erreur: null };
}

// ─── Annuler une validation (tant que le bulletin n'est pas payé) ───

export async function annulerValidation(formData: FormData): Promise<void> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR");
  const vacationId = String(formData.get("vacationId") ?? "");

  const vacation = await db.vacation.findFirst({ where: { id: vacationId, statut: "VALIDEE" } });
  if (!vacation) {
    redirect("/payroll");
  }

  await db.$transaction(async (tx) => {
    await tx.vacation.deleteMany({ where: { id: vacation.id, statut: "VALIDEE" } });
    await tx.journalAudit.create({
      data: {
        institutId: institut.id,
        auteurId: membre.utilisateurId,
        action: "VACATION_ANNULEE",
        entite: "Vacation",
        entiteId: vacation.id,
        avant: { numero: vacation.numero, mois: vacation.mois, montantNet: vacation.montantNet },
      },
    });
  });

  await flash("Validation annulée : le bulletin repasse à valider.");
  revalidatePath("/payroll");
  redirect(`/payroll?mois=${vacation.mois}`);
}
