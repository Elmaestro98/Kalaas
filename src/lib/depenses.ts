// Dépenses : catégories et libellés (utilisable côté client)

export type CategorieDepenseSaisie =
  | "LOYER"
  | "EAU_ELECTRICITE"
  | "INTERNET_TELEPHONE"
  | "SALAIRES"
  | "FOURNITURES"
  | "PUBLICITE"
  | "AUTRE";

export const CATEGORIES_DEPENSE: { valeur: CategorieDepenseSaisie; label: string }[] = [
  { valeur: "LOYER", label: "Loyer" },
  { valeur: "EAU_ELECTRICITE", label: "Eau et électricité" },
  { valeur: "INTERNET_TELEPHONE", label: "Internet et téléphone" },
  { valeur: "SALAIRES", label: "Salaires des permanents" },
  { valeur: "FOURNITURES", label: "Fournitures et matériel" },
  { valeur: "PUBLICITE", label: "Publicité" },
  { valeur: "AUTRE", label: "Autre" },
];

export const LABEL_CATEGORIE: Record<CategorieDepenseSaisie, string> = Object.fromEntries(
  CATEGORIES_DEPENSE.map((c) => [c.valeur, c.label]),
) as Record<CategorieDepenseSaisie, string>;
