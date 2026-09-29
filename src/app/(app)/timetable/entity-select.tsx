"use client";

import { useRouter } from "next/navigation";
import { classeChamp } from "@/components/ui/field";

type Groupe = { label: string; options: { id: string; label: string }[] };

type EntitySelectProps = {
  vue: string;
  valeur: string;
  groupes: Groupe[];
  label: string;
};

// Liste déroulante qui change d'emploi du temps dès qu'on choisit une option
export default function EntitySelect({ vue, valeur, groupes, label }: EntitySelectProps) {
  const router = useRouter();

  return (
    <select
      aria-label={label}
      value={valeur}
      onChange={(e) => router.push(`/timetable?vue=${vue}&id=${e.target.value}`)}
      className={`${classeChamp()} lg:max-w-md`}
    >
      {groupes.map((g) =>
        g.label ? (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ) : (
          g.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))
        ),
      )}
    </select>
  );
}
