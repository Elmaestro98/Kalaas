"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContexte } from "@/lib/tenant";
import { CYCLES, codeNiveau, estLmd } from "@/lib/lmd";
import { compter, tauxAssiduite } from "@/lib/presences";
import { formaterNumeroDocument, refusDocument, type ContenuDocument } from "@/lib/documents";

export type EtatDocument = {
  erreur: string | null;
  document: { id: string; numero: string } | null;
};

const schema = z.object({
  inscriptionId: z.string().min(1),
  type: z.enum(["ATTESTATION_INSCRIPTION", "CERTIFICAT_SCOLARITE"]),
  motif: z.string().trim().max(120, "Motif trop long (120 caractères maximum).").optional(),
});

const jour = (d: Date) => d.toISOString().slice(0, 10);

export async function delivrerDocument(_etat: EtatDocument, formData: FormData): Promise<EtatDocument> {
  const { institut, membre, db } = await getContexte();
  if (membre.role !== "DIRECTEUR" && membre.role !== "CAISSIER") {
    return { erreur: "Seuls la direction et la scolarité délivrent des documents.", document: null };
  }

  const lu = schema.safeParse({
    inscriptionId: formData.get("inscriptionId"),
    type: formData.get("type"),
    motif: formData.get("motif") || undefined,
  });
  if (!lu.success) {
    return { erreur: lu.error.issues[0]?.message ?? "Demande invalide.", document: null };
  }
  const { inscriptionId, type, motif } = lu.data;

  const inscription = await db.inscription.findFirst({
    where: { id: inscriptionId },
    include: {
      apprenant: true,
      session: { include: { formation: true, anneeAcademique: { select: { libelle: true } } } },
    },
  });
  if (!inscription) {
    return { erreur: "Inscription introuvable.", document: null };
  }
  const refus = refusDocument(type, inscription.statut);
  if (refus) {
    return { erreur: refus, document: null };
  }

  // Assiduité (certificat) : d'après les appels déjà faits
  let assiduite: number | null = null;
  if (type === "CERTIFICAT_SCOLARITE") {
    const presences = await db.presence.findMany({ where: { inscriptionId }, select: { statut: true } });
    assiduite = tauxAssiduite(compter(presences.map((p) => p.statut)));
  }

  const { apprenant, session } = inscription;
  const contenu: ContenuDocument = {
    apprenant: {
      prenom: apprenant.prenom,
      nom: apprenant.nom,
      sexe: apprenant.sexe,
      matricule: apprenant.matricule,
      dateNaissance: apprenant.dateNaissance ? jour(apprenant.dateNaissance) : null,
      lieuNaissance: apprenant.lieuNaissance,
    },
    formation: session.formation.intitule,
    cycle: estLmd(session.formation.cycle) ? CYCLES[session.formation.cycle].label : null,
    niveau: codeNiveau(session.formation.cycle, session.formation.niveau) || null,
    classe: session.nom,
    anneeAcademique: session.anneeAcademique?.libelle ?? null,
    dateDebut: jour(session.dateDebut),
    dateFin: jour(session.dateFin),
    dateInscription: jour(inscription.date),
    enCours: inscription.statut === "ACTIVE",
    assiduite,
  };

  const annee = new Date().getFullYear();
  // Transaction : le numéro est réservé et le document créé ensemble (jamais de doublon ni de trou)
  const document = await db.$transaction(async (tx) => {
    const compteur = await tx.compteurDocument.upsert({
      where: { institutId_type_annee: { institutId: institut.id, type, annee } },
      create: { institutId: institut.id, type, annee, dernier: 1 },
      update: { dernier: { increment: 1 } },
    });
    const cree = await tx.documentDelivre.create({
      data: {
        institutId: institut.id,
        inscriptionId,
        type,
        numero: formaterNumeroDocument(type, annee, compteur.dernier),
        annee,
        motif: motif ?? null,
        contenu,
        delivreParId: membre.id,
      },
    });
    await tx.journalAudit.create({
      data: {
        institutId: institut.id,
        auteurId: membre.utilisateurId,
        action: "DOCUMENT_DELIVRE",
        entite: "DocumentDelivre",
        entiteId: cree.id,
        apres: { numero: cree.numero, type, apprenant: `${apprenant.prenom} ${apprenant.nom}` },
      },
    });
    return cree;
  });

  revalidatePath(`/students/${apprenant.id}`);
  return { erreur: null, document: { id: document.id, numero: document.numero } };
}
