// Attestations d'inscription et certificats de scolarité (règles pures, sans base de données)

export type TypeDocumentSaisie = "ATTESTATION_INSCRIPTION" | "CERTIFICAT_SCOLARITE";
export type StatutInscriptionSaisie = "ACTIVE" | "ABANDON" | "TERMINEE" | "TRANSFEREE";

export const TYPES_DOCUMENT: Record<TypeDocumentSaisie, { label: string; titre: string; prefixe: string; aide: string }> = {
  ATTESTATION_INSCRIPTION: {
    label: "Attestation d'inscription",
    titre: "ATTESTATION D'INSCRIPTION",
    prefixe: "ATT",
    aide: "Bourse, visa, stage, banque…",
  },
  CERTIFICAT_SCOLARITE: {
    label: "Certificat de scolarité",
    titre: "CERTIFICAT DE SCOLARITÉ",
    prefixe: "CS",
    aide: "Allocations, administration, employeur… (inscription en cours uniquement)",
  },
};

// ATT-2026-00001, CS-2026-00012…
export function formaterNumeroDocument(type: TypeDocumentSaisie, annee: number, numero: number): string {
  return `${TYPES_DOCUMENT[type].prefixe}-${annee}-${String(numero).padStart(5, "0")}`;
}

// Raison du refus, ou null si le document peut être délivré
export function refusDocument(type: TypeDocumentSaisie, statut: StatutInscriptionSaisie): string | null {
  if (statut === "ABANDON") return "Inscription abandonnée : aucun document ne peut être délivré.";
  if (statut === "TRANSFEREE") return "Inscription transférée : délivrez le document depuis la nouvelle inscription.";
  if (type === "CERTIFICAT_SCOLARITE" && statut !== "ACTIVE") {
    return "Le certificat de scolarité n'est délivré que pour une inscription en cours.";
  }
  return null;
}

// Copie figée de ce qui est imprimé : retélécharger le document donne toujours le même PDF
export type ContenuDocument = {
  apprenant: {
    prenom: string;
    nom: string;
    sexe: "F" | "M" | null;
    matricule: string | null;
    dateNaissance: string | null; // AAAA-MM-JJ
    lieuNaissance: string | null;
  };
  formation: string;
  cycle: string | null; // « Licence », null pour une formation courte
  niveau: string | null; // « L1 »
  classe: string;
  anneeAcademique: string | null;
  dateDebut: string; // AAAA-MM-JJ
  dateFin: string;
  dateInscription: string;
  enCours: boolean; // false : inscription terminée au moment de la délivrance
  assiduite: number | null; // taux en %, certificat uniquement
};

// Accords selon le sexe (« inscrit » / « inscrite »), neutre si inconnu
export function accord(sexe: "F" | "M" | null, masculin: string, feminin: string): string {
  if (sexe === "F") return feminin;
  if (sexe === "M") return masculin;
  return `${masculin}(${feminin.slice(masculin.length) || "e"})`;
}

export function civilite(sexe: "F" | "M" | null): string {
  return sexe === "F" ? "Mme" : sexe === "M" ? "M." : "";
}
