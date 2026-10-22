// Type d'établissement : adapte le vocabulaire de l'interface (apprenant, étudiant, élève)
import type { TypeEtablissement } from "@prisma/client";

export const TYPES_ETABLISSEMENT: Record<
  TypeEtablissement,
  { label: string; aide: string; apprenant: string; apprenants: string }
> = {
  INSTITUT: {
    label: "Institut de formation",
    aide: "Formations courtes, certifiantes, professionnelles",
    apprenant: "Apprenant",
    apprenants: "Apprenants",
  },
  UNIVERSITE: {
    label: "Université ou école supérieure",
    aide: "Licence, Master (LMD)",
    apprenant: "Étudiant",
    apprenants: "Étudiants",
  },
  ECOLE: {
    label: "École",
    aide: "Préscolaire, élémentaire, collège, lycée",
    apprenant: "Élève",
    apprenants: "Élèves",
  },
};

export const ORDRE_TYPES: TypeEtablissement[] = ["ECOLE", "UNIVERSITE", "INSTITUT"];

// Les trois mots commencent par une voyelle : « l'élève », « d'apprenant », « un étudiant » restent corrects
export type Vocabulaire = {
  Apprenant: string;
  Apprenants: string;
  apprenant: string;
  apprenants: string;
  // École : le parent est le contact principal (reçus, relances)
  parentContact: boolean;
};

export function vocabulaire(type: TypeEtablissement): Vocabulaire {
  const { apprenant, apprenants } = TYPES_ETABLISSEMENT[type];
  return {
    Apprenant: apprenant,
    Apprenants: apprenants,
    apprenant: apprenant.toLowerCase(),
    apprenants: apprenants.toLowerCase(),
    parentContact: type === "ECOLE",
  };
}
