// Normalise un numéro sénégalais au format « +221 77 123 45 67 ».
// Accepte « 771234567 », « 77 123 45 67 », « +221771234567 »…
export function normaliserTelephone(saisie: string): string | null {
  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.startsWith("221") && chiffres.length === 12) {
    chiffres = chiffres.slice(3);
  }
  if (!/^[37]\d{8}$/.test(chiffres)) {
    return null;
  }
  return `+221 ${chiffres.slice(0, 2)} ${chiffres.slice(2, 5)} ${chiffres.slice(5, 7)} ${chiffres.slice(7)}`;
}

export function lienWhatsApp(telephone: string): string {
  return `https://wa.me/${telephone.replace(/\D/g, "")}`;
}
