"use server";

import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/tenant";
import { calculerRemise, dateDuJour, genererEcheances } from "@/lib/echeancier";
import { repartirPaiement } from "@/lib/paiements";
import { prochainMatricule } from "@/lib/matricules";
import { normaliserTelephone } from "@/lib/telephone";
import {
  LIBELLES_CHAMPS,
  lireFichierApprenants,
  verifierLigne,
  type LigneImport,
} from "@/lib/import-apprenants";

const TAILLE_MAX = 900 * 1024; // sous la limite de 1 Mo des actions serveur
const LIGNES_MAX = 1000;

// ─── Étape 1 : analyser le fichier (aperçu, rien n'est enregistré) ───

export type EtatAnalyse = {
  erreur: string | null;
  sessionId: string;
  nomFichier: string | null;
  lignes: LigneImport[];
  colonnes: string[];
  colonnesIgnorees: string[];
};

export async function analyserFichier(_etat: EtatAnalyse, formData: FormData): Promise<EtatAnalyse> {
  const { db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const sessionId = String(formData.get("sessionId") ?? "");
  const vide: EtatAnalyse = { erreur: null, sessionId, nomFichier: null, lignes: [], colonnes: [], colonnesIgnorees: [] };

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { ...vide, erreur: "Choisissez un fichier Excel (.xlsx) ou CSV." };
  }
  if (!/\.(xlsx|csv)$/i.test(fichier.name)) {
    return { ...vide, erreur: "Format non pris en charge : enregistrez votre fichier en .xlsx ou .csv." };
  }
  if (fichier.size > TAILLE_MAX) {
    return { ...vide, erreur: "Fichier trop lourd (900 Ko maximum). Retirez les colonnes inutiles ou les images." };
  }

  let lecture;
  try {
    lecture = await lireFichierApprenants(await fichier.arrayBuffer(), fichier.name);
  } catch {
    return { ...vide, erreur: "Impossible de lire ce fichier. Vérifiez qu'il s'ouvre bien dans Excel." };
  }
  if (lecture.lignes.length === 0) {
    return {
      ...vide,
      erreur: "Aucune colonne reconnue. Utilisez le modèle Kalaas ou des en-têtes comme « Prénom », « Nom », « Téléphone ».",
    };
  }
  if (lecture.lignes.length > LIGNES_MAX) {
    return { ...vide, erreur: `Trop de lignes (${LIGNES_MAX} maximum par import). Découpez votre fichier.` };
  }

  // Vérification ligne par ligne (avec le vrai numéro de ligne du fichier)
  const lignes = lecture.lignes.map((l) => verifierLigne(l.valeurs, l.numero));

  // Doublons : dans le fichier, puis avec les apprenants déjà dans Kalaas (même téléphone)
  const existants = new Set(
    (
      await db.apprenant.findMany({
        where: { telephone: { in: lignes.filter((l) => l.statut === "OK").map((l) => l.telephone) } },
        select: { telephone: true },
      })
    ).map((a) => a.telephone),
  );
  const vus = new Set<string>();
  for (const l of lignes) {
    if (l.statut !== "OK") continue;
    if (existants.has(l.telephone)) {
      l.statut = "DOUBLON";
      l.message = "déjà dans Kalaas (même téléphone)";
    } else if (vus.has(l.telephone)) {
      l.statut = "DOUBLON";
      l.message = "en double dans le fichier";
    }
    vus.add(l.telephone);
  }

  return {
    erreur: null,
    sessionId,
    nomFichier: fichier.name,
    lignes,
    colonnes: lecture.colonnesReconnues.map((c) => LIBELLES_CHAMPS[c]),
    colonnesIgnorees: lecture.colonnesIgnorees,
  };
}

// ─── Étape 2 : importer les lignes valides ─────────

export type ResultatImport = {
  erreur: string | null;
  importes: number;
  echecs: { numero: number; nom: string; raison: string }[];
};

export async function importerApprenants(donnees: {
  sessionId: string;
  lignes: LigneImport[];
}): Promise<ResultatImport> {
  const { institut, membre, db } = await exigerRole("DIRECTEUR", "CAISSIER");

  // Tout est revérifié côté serveur : on ne fait pas confiance à l'aperçu renvoyé par le navigateur
  const lignes = (Array.isArray(donnees.lignes) ? donnees.lignes : [])
    .slice(0, LIGNES_MAX)
    .map((l) =>
      verifierLigne(
        {
          prenom: String(l.prenom ?? ""),
          nom: String(l.nom ?? ""),
          telephone: String(l.telephone ?? ""),
          email: l.email ?? undefined,
          dateNaissance: l.dateNaissance ?? undefined,
          lieuNaissance: l.lieuNaissance ?? undefined,
          sexe: l.sexe ?? undefined,
          pieceIdentite: l.pieceIdentite ?? undefined,
          tuteurNom: l.tuteurNom ?? undefined,
          tuteurTelephone: l.tuteurTelephone ?? undefined,
          dejaPaye: String(l.dejaPaye ?? 0),
        },
        Number(l.numero) || 0,
      ),
    )
    .filter((l) => l.statut === "OK");

  if (lignes.length === 0) {
    return { erreur: "Aucune ligne valide à importer.", importes: 0, echecs: [] };
  }

  // Classe facultative : inscription + échéancier
  const aujourdhui = dateDuJour();
  const session = donnees.sessionId
    ? await db.session.findFirst({
        where: { id: donnees.sessionId },
        include: {
          formation: true,
          anneeAcademique: true,
          _count: { select: { inscriptions: { where: { statut: "ACTIVE" } } } },
        },
      })
    : null;
  if (donnees.sessionId && !session) {
    return { erreur: "Classe introuvable.", importes: 0, echecs: [] };
  }
  if (session && session.dateFin < aujourdhui) {
    return { erreur: "Cette classe est terminée.", importes: 0, echecs: [] };
  }
  if (session?.capacite && session._count.inscriptions + lignes.length > session.capacite) {
    const libres = Math.max(0, session.capacite - session._count.inscriptions);
    return {
      erreur: `La classe n'a que ${libres} place${libres > 1 ? "s" : ""} libre${libres > 1 ? "s" : ""} pour ${lignes.length} apprenants. Augmentez la capacité ou choisissez une autre classe.`,
      importes: 0,
      echecs: [],
    };
  }

  const anneeEntree = (session?.anneeAcademique?.dateDebut ?? aujourdhui).getUTCFullYear();
  const echecs: ResultatImport["echecs"] = [];
  let importes = 0;

  // Une transaction par apprenant : une ligne en échec n'empêche pas les autres
  for (const l of lignes) {
    try {
      // Doublon apparu entre l'aperçu et la confirmation ?
      if (await db.apprenant.findFirst({ where: { telephone: l.telephone }, select: { id: true } })) {
        echecs.push({ numero: l.numero, nom: `${l.prenom} ${l.nom}`, raison: "déjà dans Kalaas (même téléphone)" });
        continue;
      }

      await db.$transaction(async (tx) => {
        const apprenant = await tx.apprenant.create({
          data: {
            institutId: institut.id,
            matricule: await prochainMatricule(tx, institut, anneeEntree),
            prenom: l.prenom,
            nom: l.nom,
            telephone: l.telephone,
            email: l.email,
            dateNaissance: l.dateNaissance ? new Date(l.dateNaissance) : null,
            lieuNaissance: l.lieuNaissance,
            sexe: l.sexe,
            pieceIdentite: l.pieceIdentite,
            tuteurNom: l.tuteurNom,
            tuteurTelephone: l.tuteurTelephone ? normaliserTelephone(l.tuteurTelephone) : null,
          },
        });

        if (!session) return;

        const inscription = await tx.inscription.create({
          data: { institutId: institut.id, apprenantId: apprenant.id, sessionId: session.id, type: "NOUVELLE" },
        });

        const echeances = genererEcheances({
          fraisInscription: session.formation.fraisInscription,
          prixTotal: session.formation.prixTotal,
          nbMensualites: session.formation.nbMensualites,
          remise: calculerRemise(session.formation.prixTotal, null, 0),
          dateInscription: aujourdhui,
          debutSession: session.dateDebut,
        });

        // Reprise du « déjà payé » avant Kalaas : réparti sur les plus anciennes échéances,
        // sans créer de paiement (l'argent a été encaissé avant, il ne compte pas dans la caisse du jour)
        const totalDu = echeances.reduce((s, e) => s + e.montantDu, 0);
        const reprise = Math.min(l.dejaPaye, totalDu);
        const { affectations } = repartirPaiement(
          echeances.map((e, i) => ({ id: String(i), reste: e.montantDu })),
          reprise,
        );
        const payeParIndex = new Map(affectations.map((a) => [Number(a.echeanceId), a.montant]));

        await tx.echeance.createMany({
          data: echeances.map((e, i) => {
            const paye = payeParIndex.get(i) ?? 0;
            return {
              institutId: institut.id,
              inscriptionId: inscription.id,
              ...e,
              montantPaye: paye,
              statut: paye >= e.montantDu ? ("PAYEE" as const) : paye > 0 ? ("PARTIEL" as const) : ("A_PAYER" as const),
            };
          }),
        });

        if (reprise > 0) {
          await tx.journalAudit.create({
            data: {
              institutId: institut.id,
              auteurId: membre.utilisateurId,
              action: "REPRISE_SOLDE_IMPORT",
              entite: "Inscription",
              entiteId: inscription.id,
              apres: { apprenant: `${l.prenom} ${l.nom}`, dejaPaye: reprise, totalDu },
            },
          });
        }
      });
      importes += 1;
    } catch {
      echecs.push({ numero: l.numero, nom: `${l.prenom} ${l.nom}`, raison: "erreur lors de l'enregistrement" });
    }
  }

  await db.journalAudit.create({
    data: {
      institutId: institut.id,
      auteurId: membre.utilisateurId,
      action: "IMPORT_APPRENANTS",
      entite: "Apprenant",
      entiteId: session?.id ?? "sans-classe",
      apres: { importes, echecs: echecs.length, classe: session?.nom ?? null },
    },
  });

  revalidatePath("/students");
  revalidatePath("/enrollments");
  revalidatePath("/courses");
  return { erreur: null, importes, echecs };
}
