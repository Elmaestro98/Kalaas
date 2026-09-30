// Relances des impayés : modèles de messages WhatsApp et calcul des retards.
// Phase 1 : liens wa.me (un clic du caissier) ; phase 2 : WhatsApp Cloud API.

export type Declencheur = "MANUELLE" | "J_MOINS_3" | "J_PLUS_1" | "J_PLUS_7";

export const DECLENCHEURS: { valeur: Declencheur; label: string; description: string }[] = [
  { valeur: "MANUELLE", label: "Relance manuelle", description: "Envoyée depuis la liste des impayés" },
  { valeur: "J_MOINS_3", label: "J-3 · rappel", description: "3 jours avant la date limite" },
  { valeur: "J_PLUS_1", label: "J+1 · retard", description: "Le lendemain de la date limite" },
  { valeur: "J_PLUS_7", label: "J+7 · relance ferme", description: "7 jours après la date limite" },
];

export const MODELES_PAR_DEFAUT: Record<Declencheur, string> = {
  MANUELLE:
    "Bonjour {prenom}, sauf erreur de notre part, {montant} restent à régler pour votre formation {formation} ({echeances}). Merci de passer à l'accueil ou de payer par Wave / Orange Money. {etablissement}",
  J_MOINS_3:
    "Bonjour {prenom}, petit rappel : votre {echeance} de {montant} arrive à échéance le {date}. Merci d'avance ! {etablissement}",
  J_PLUS_1:
    "Bonjour {prenom}, votre {echeance} de {montant} était attendue le {date}. Merci de régulariser dès que possible. {etablissement}",
  J_PLUS_7:
    "Bonjour {prenom}, votre paiement de {montant} a maintenant {jours} jours de retard. Merci de passer régulariser ou de nous contacter rapidement. {etablissement}",
};

export const VARIABLES: { cle: string; description: string }[] = [
  { cle: "prenom", description: "Prénom de l'apprenant" },
  { cle: "nom", description: "Nom de l'apprenant" },
  { cle: "montant", description: "Montant à régler (ex. 30 000 FCFA)" },
  { cle: "echeance", description: "Libellé de l'échéance (ex. Mensualité 2/6)" },
  { cle: "echeances", description: "Liste des échéances concernées" },
  { cle: "date", description: "Date limite (ex. 5 nov. 2026)" },
  { cle: "jours", description: "Nombre de jours de retard" },
  { cle: "formation", description: "Formation suivie" },
  { cle: "etablissement", description: "Nom de votre établissement" },
];

// Remplace {prenom}, {montant}… ; une variable inconnue est laissée telle quelle
export function rendreMessage(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{(\w+)\}/g, (tout, cle: string) => valeurs[cle] ?? tout);
}

const JOUR_MS = 86_400_000;

// Nombre de jours entre la date limite et aujourd'hui (positif = en retard)
export function joursDeRetard(dateLimite: Date, aujourdhui: Date): number {
  return Math.round((aujourdhui.getTime() - dateLimite.getTime()) / JOUR_MS);
}

// Échéance concernée aujourd'hui par une relance automatique ?
export function declencheurDuJour(dateLimite: Date, aujourdhui: Date): Declencheur | null {
  const ecart = joursDeRetard(dateLimite, aujourdhui);
  if (ecart === -3) return "J_MOINS_3";
  if (ecart === 1) return "J_PLUS_1";
  if (ecart === 7) return "J_PLUS_7";
  return null;
}

export type Tranche = "TOUS" | "SEMAINE" | "MOIS" | "PLUS";

export const TRANCHES: { valeur: Tranche; label: string }[] = [
  { valeur: "TOUS", label: "Tous" },
  { valeur: "SEMAINE", label: "1 à 7 jours" },
  { valeur: "MOIS", label: "8 à 30 jours" },
  { valeur: "PLUS", label: "Plus de 30 jours" },
];

export function trancheDeRetard(jours: number): Exclude<Tranche, "TOUS"> {
  if (jours <= 7) return "SEMAINE";
  if (jours <= 30) return "MOIS";
  return "PLUS";
}
