import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export default function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p id={`${id}-erreur`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-aide`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function classeChamp(erreur?: string) {
  return `h-11 w-full rounded-sm border bg-surface-200 px-3 text-ink outline-none transition focus:ring-4 ${
    erreur
      ? "border-danger focus:border-danger focus:ring-danger-soft"
      : "border-border focus:border-gold-500 focus:ring-gold-100"
  }`;
}

export function idDescription(id: string, erreur?: string, aide?: string) {
  if (erreur) {
    return `${id}-erreur`;
  }
  if (aide) {
    return `${id}-aide`;
  }
  return undefined;
}
