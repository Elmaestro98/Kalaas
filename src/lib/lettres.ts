// Écrit un nombre entier en toutes lettres, en français.
// Ex. 75 000 → « soixante-quinze mille » (utilisé sur les reçus).

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const DIZAINES = [
  "", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function moinsDeCent(n: number): string {
  if (n < 20) {
    return UNITES[n];
  }
  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  // 70-79 et 90-99 : soixante-dix, quatre-vingt-dix…
  if (dizaine === 7 || dizaine === 9) {
    const liaison = dizaine === 7 && unite === 1 ? " et " : "-";
    return DIZAINES[dizaine] + liaison + UNITES[10 + unite];
  }
  if (unite === 0) {
    return dizaine === 8 ? "quatre-vingts" : DIZAINES[dizaine];
  }
  if (unite === 1 && dizaine !== 8) {
    return `${DIZAINES[dizaine]} et un`;
  }
  return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
}

function moinsDeMille(n: number): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  let texte = "";

  if (centaines > 0) {
    texte = centaines === 1 ? "cent" : `${UNITES[centaines]} cent${reste === 0 ? "s" : ""}`;
  }
  if (reste > 0) {
    texte += (texte ? " " : "") + moinsDeCent(reste);
  }
  return texte;
}

export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    return String(n);
  }
  if (n === 0) {
    return "zéro";
  }

  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parties: string[] = [];

  if (millions > 0) {
    parties.push(millions === 1 ? "un million" : `${moinsDeMille(millions)} millions`);
  }
  if (milliers > 0) {
    // « mille » est invariable et retire le « s » de « cents » / « vingts » devant lui
    parties.push(
      milliers === 1 ? "mille" : `${moinsDeMille(milliers).replace(/(cent|vingt)s$/, "$1")} mille`,
    );
  }
  if (reste > 0) {
    parties.push(moinsDeMille(reste));
  }
  return parties.join(" ");
}
