"use client";

import { changerRole } from "./actions";

type Role = "DIRECTEUR" | "CAISSIER" | "FORMATEUR";

// Change le rôle dès qu'on choisit une autre option
export default function RoleSelect({ membreId, role, nom }: { membreId: string; role: Role; nom: string }) {
  return (
    <form action={changerRole}>
      <input type="hidden" name="id" value={membreId} />
      <select
        name="role"
        defaultValue={role}
        aria-label={`Rôle de ${nom}`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-sm border border-border bg-surface-200 px-2 text-sm"
      >
        <option value="DIRECTEUR">Directeur</option>
        <option value="CAISSIER">Caissier</option>
        <option value="FORMATEUR">Formateur</option>
      </select>
    </form>
  );
}
