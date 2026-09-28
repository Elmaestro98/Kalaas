const formateurFcfa = new Intl.NumberFormat("fr-FR");

export function formatFcfa(montant: number): string {
  return `${formateurFcfa.format(montant)} FCFA`;
}

export function formatNombre(nombre: number): string {
  return formateurFcfa.format(nombre);
}

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return formateurDate.format(date);
}
