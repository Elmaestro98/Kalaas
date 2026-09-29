"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerRole } from "@/lib/tenant";
import { normaliserTelephone } from "@/lib/telephone";
import { calculerRemise, dateDuJour, genererEcheances } from "@/lib/echeancier";
import { prochainMatricule } from "@/lib/matricules";

const MSG_TELEPHONE = "Numéro invalide (ex. 77 123 45 67).";

const schemaInscription = z
  .object({
    // Réinscription : identifiant d'un apprenant existant (sinon, nouvel apprenant)
    apprenantId: z.string().optional(),
    type: z.enum(["NOUVELLE", "REINSCRIPTION", "REDOUBLEMENT"]).optional(),

    prenom: z.string().trim().max(60, "60 caractères maximum.").optional(),
    nom: z.string().trim().max(60, "60 caractères maximum.").optional(),
    telephone: z.string().optional(),
    email: z.string().trim().max(120, "120 caractères maximum.").optional(),
    dateNaissance: z.string().optional(),
    lieuNaissance: z.string().trim().max(80, "80 caractères maximum.").optional(),
    sexe: z.enum(["F", "M", ""]).optional(),
    diplomeAcces: z.string().trim().max(80, "80 caractères maximum.").optional(),
    pieceIdentite: z.string().trim().max(40, "40 caractères maximum.").optional(),
    tuteurNom: z.string().trim().max(80, "80 caractères maximum.").optional(),
    tuteurTelephone: z.string().optional(),

    sessionId: z.string().min(1, "Choisissez une session."),
    avecRemise: z.string().optional(),
    remiseType: z.enum(["MONTANT", "POURCENTAGE"]).optional(),
    remiseValeur: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.number().int("Indiquez un nombre entier.").min(0).optional(),
    ),
    motifRemise: z.string().trim().max(120, "120 caractères maximum.").optional(),
  })
  .superRefine((d, ctx) => {
    // Identité obligatoire seulement pour un nouvel apprenant
    if (!d.apprenantId) {
      if (!d.prenom) {
        ctx.addIssue({ code: "custom", path: ["prenom"], message: "Indiquez le prénom." });
      }
      if (!d.nom) {
        ctx.addIssue({ code: "custom", path: ["nom"], message: "Indiquez le nom." });
      }
      if (!d.telephone || normaliserTelephone(d.telephone) === null) {
        ctx.addIssue({ code: "custom", path: ["telephone"], message: MSG_TELEPHONE });
      }
      if (d.tuteurTelephone?.trim() && normaliserTelephone(d.tuteurTelephone) === null) {
        ctx.addIssue({ code: "custom", path: ["tuteurTelephone"], message: MSG_TELEPHONE });
      }
      if (d.email && !z.email().safeParse(d.email).success) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Adresse e-mail invalide." });
      }
      if (d.dateNaissance && !z.iso.date().safeParse(d.dateNaissance).success) {
        ctx.addIssue({ code: "custom", path: ["dateNaissance"], message: "Date invalide." });
      }
    }

    if (d.avecRemise !== "on") {
      return;
    }
    if (!d.remiseType) {
      ctx.addIssue({ code: "custom", path: ["remiseType"], message: "Choisissez le type de remise." });
    }
    if (!d.remiseValeur) {
      ctx.addIssue({ code: "custom", path: ["remiseValeur"], message: "Indiquez la valeur de la remise." });
    }
    if (d.remiseType === "POURCENTAGE" && (d.remiseValeur ?? 0) > 100) {
      ctx.addIssue({ code: "custom", path: ["remiseValeur"], message: "100 % maximum." });
    }
    if (!d.motifRemise) {
      ctx.addIssue({ code: "custom", path: ["motifRemise"], message: "Indiquez le motif de la remise." });
    }
  });

export type ChampInscription =
  | "prenom"
  | "nom"
  | "telephone"
  | "email"
  | "dateNaissance"
  | "lieuNaissance"
  | "sexe"
  | "diplomeAcces"
  | "pieceIdentite"
  | "tuteurNom"
  | "tuteurTelephone"
  | "sessionId"
  | "type"
  | "remiseType"
  | "remiseValeur"
  | "motifRemise";

export type EtatInscription = {
  erreurs: Partial<Record<ChampInscription, string>>;
  erreurGenerale: string | null;
};

function erreur(champ: ChampInscription, message: string): EtatInscription {
  return { erreurs: { [champ]: message }, erreurGenerale: null };
}

const vide = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export async function creerInscription(
  _etat: EtatInscription,
  formData: FormData,
): Promise<EtatInscription> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  const resultat = schemaInscription.safeParse(Object.fromEntries(formData));
  if (!resultat.success) {
    const { fieldErrors } = z.flattenError(resultat.error);
    const erreurs: EtatInscription["erreurs"] = {};
    for (const [champ, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        erreurs[champ as ChampInscription] = messages[0];
      }
    }
    return { erreurs, erreurGenerale: null };
  }
  const d = resultat.data;
  const aujourdhui = dateDuJour();

  // La session doit appartenir à l'établissement (filtre db) et ne pas être terminée
  const session = await db.session.findFirst({
    where: { id: d.sessionId },
    include: { formation: true, anneeAcademique: true },
  });
  if (!session) {
    return erreur("sessionId", "Session introuvable.");
  }
  if (session.dateFin < aujourdhui) {
    return erreur("sessionId", "Cette session est terminée.");
  }

  // Réinscription : l'apprenant doit exister dans l'établissement
  const existant = d.apprenantId
    ? await db.apprenant.findFirst({
        where: { id: d.apprenantId },
        include: { inscriptions: { orderBy: { date: "desc" }, take: 1 } },
      })
    : null;
  if (d.apprenantId && !existant) {
    return { erreurs: {}, erreurGenerale: "Apprenant introuvable." };
  }
  if (existant) {
    const dejaInscrit = await db.inscription.findFirst({
      where: { apprenantId: existant.id, sessionId: session.id, statut: "ACTIVE" },
    });
    if (dejaInscrit) {
      return erreur("sessionId", "Cet apprenant est déjà inscrit à cette session.");
    }
  }
  const precedente = existant?.inscriptions[0] ?? null;
  const type = existant ? (d.type ?? "REINSCRIPTION") : "NOUVELLE";

  const avecRemise = d.avecRemise === "on";
  const remiseType = avecRemise ? (d.remiseType ?? null) : null;
  const remiseValeur = avecRemise ? (d.remiseValeur ?? 0) : 0;
  if (remiseType === "MONTANT" && remiseValeur > session.formation.prixTotal) {
    return erreur("remiseValeur", "La remise dépasse le prix de la formation.");
  }
  const remise = calculerRemise(session.formation.prixTotal, remiseType, remiseValeur);

  const echeances = genererEcheances({
    fraisInscription: session.formation.fraisInscription,
    prixTotal: session.formation.prixTotal,
    nbMensualites: session.formation.nbMensualites,
    remise,
    dateInscription: aujourdhui,
    debutSession: session.dateDebut,
  });
  const totalDu = echeances.reduce((somme, e) => somme + e.montantDu, 0);

  // Année d'entrée du matricule : début de l'année académique, sinon année en cours
  const anneeEntree = (session.anneeAcademique?.dateDebut ?? aujourdhui).getUTCFullYear();

  let apprenantId: string;
  try {
    apprenantId = await db.$transaction(async (tx) => {
      if (session.capacite) {
        const inscrits = await tx.inscription.count({
          where: { sessionId: session.id, statut: "ACTIVE" },
        });
        if (inscrits >= session.capacite) {
          throw new Error("SESSION_COMPLETE");
        }
      }

      let idApprenant: string;
      let nomApprenant: string;
      if (existant) {
        idApprenant = existant.id;
        nomApprenant = `${existant.prenom} ${existant.nom}`;
        // Apprenant créé avant les matricules : on lui en attribue un
        if (!existant.matricule) {
          await tx.apprenant.update({
            where: { id: existant.id },
            data: { matricule: await prochainMatricule(tx, institut, anneeEntree) },
          });
        }
      } else {
        const cree = await tx.apprenant.create({
          data: {
            institutId: institut.id,
            matricule: await prochainMatricule(tx, institut, anneeEntree),
            prenom: d.prenom!,
            nom: d.nom!,
            telephone: normaliserTelephone(d.telephone!)!,
            email: vide(d.email),
            dateNaissance: d.dateNaissance ? new Date(d.dateNaissance) : null,
            lieuNaissance: vide(d.lieuNaissance),
            sexe: d.sexe ? d.sexe : null,
            diplomeAcces: vide(d.diplomeAcces),
            pieceIdentite: vide(d.pieceIdentite),
            tuteurNom: vide(d.tuteurNom),
            tuteurTelephone: d.tuteurTelephone?.trim() ? normaliserTelephone(d.tuteurTelephone) : null,
          },
        });
        idApprenant = cree.id;
        nomApprenant = `${cree.prenom} ${cree.nom}`;
      }

      // L'année précédente se clôt : ses échéances restent dues et visibles
      if (precedente && precedente.statut === "ACTIVE" && type !== "NOUVELLE") {
        await tx.inscription.update({
          where: { id: precedente.id },
          data: { statut: "TERMINEE", dateSortie: aujourdhui },
        });
      }

      const inscription = await tx.inscription.create({
        data: {
          institutId: institut.id,
          apprenantId: idApprenant,
          sessionId: session.id,
          type,
          inscriptionPrecedenteId: precedente?.id ?? null,
          remiseType,
          remiseValeur,
          motifRemise: avecRemise ? (d.motifRemise ?? null) : null,
        },
      });

      await tx.echeance.createMany({
        data: echeances.map((e) => ({
          institutId: institut.id,
          inscriptionId: inscription.id,
          ...e,
        })),
      });

      await tx.journalAudit.create({
        data: {
          institutId: institut.id,
          auteurId: membre.utilisateurId,
          action: type === "NOUVELLE" ? "INSCRIPTION_CREEE" : "REINSCRIPTION_CREEE",
          entite: "Inscription",
          entiteId: inscription.id,
          apres: {
            apprenant: nomApprenant,
            session: session.nom,
            formation: session.formation.intitule,
            annee: session.anneeAcademique?.libelle ?? null,
            type,
            totalDu,
            remise,
            remiseType,
            remiseValeur,
            motifRemise: inscription.motifRemise,
          },
        },
      });

      return idApprenant;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_COMPLETE") {
      return erreur("sessionId", "Cette session est complète.");
    }
    return {
      erreurs: {},
      erreurGenerale: "L'inscription a échoué. Réessayez dans un instant.",
    };
  }

  revalidatePath("/students");
  revalidatePath("/enrollments");
  revalidatePath("/courses");
  redirect(`/students/${apprenantId}`);
}
