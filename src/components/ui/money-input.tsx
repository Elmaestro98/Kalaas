"use client";

import { formatNombre } from "@/lib/format";

type MoneyInputProps = {
  id: string;
  name: string;
  value: number;
  onChange: (valeur: number) => void;
  className: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function MoneyInput({
  id,
  name,
  value,
  onChange,
  className,
  required,
  invalid,
  describedBy,
}: MoneyInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value > 0 ? formatNombre(value) : ""}
        onChange={(e) => {
          const chiffres = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(chiffres === "" ? 0 : Number(chiffres));
        }}
        className={`${className} pr-16 text-right tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
        FCFA
      </span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
