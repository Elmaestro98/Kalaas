"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-200 px-4 font-medium text-ink hover:bg-surface-100"
    >
      <Printer size={18} aria-hidden="true" />
      Imprimer
    </button>
  );
}
