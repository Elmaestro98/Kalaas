// Répartit un montant en N parts entières dont la somme est exacte.
// Ex. 400 000 en 6 → [66 667, 66 667, 66 667, 66 667, 66 666, 66 666]
export function repartirMontant(total: number, nombre: number): number[] {
  if (nombre < 1 || total < 0) {
    return [];
  }

  const base = Math.floor(total / nombre);
  const reste = total - base * nombre;

  return Array.from({ length: nombre }, (_, index) =>
    index < reste ? base + 1 : base,
  );
}

export type GroupeMontant = { nombre: number; montant: number };

// Regroupe les montants identiques qui se suivent.
// Ex. [66 667, 66 667, 66 666] → [{ 2 × 66 667 }, { 1 × 66 666 }]
export function grouperMontants(montants: number[]): GroupeMontant[] {
  const groupes: GroupeMontant[] = [];

  for (const montant of montants) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.montant === montant) {
      dernier.nombre += 1;
    } else {
      groupes.push({ nombre: 1, montant });
    }
  }

  return groupes;
}
