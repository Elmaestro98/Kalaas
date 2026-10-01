"use client";

import { useRouter } from "next/navigation";
import { classeChamp } from "@/components/ui/field";

type ClassSelectProps = {
  valeur: string;
  chemin: string;
  classes: { id: string; label: string; groupe: string }[];
};

// Change de classe dès qu'on choisit une option
export default function ClassSelect({ valeur, chemin, classes }: ClassSelectProps) {
  const router = useRouter();
  const groupes = [...new Set(classes.map((c) => c.groupe))];

  return (
    <select
      aria-label="Classe"
      value={valeur}
      onChange={(e) => router.push(`${chemin}?session=${e.target.value}`)}
      className={`${classeChamp()} lg:max-w-lg`}
    >
      {groupes.map((g) => (
        <optgroup key={g} label={g}>
          {classes
            .filter((c) => c.groupe === g)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
