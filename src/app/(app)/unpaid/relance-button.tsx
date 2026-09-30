"use client";

import { useState, useTransition } from "react";
import { Check, MessageCircle } from "lucide-react";
import { enregistrerRelance } from "./actions";

type RelanceButtonProps = {
  href: string;
  label: string;
  apprenantId: string;
  declencheur: "MANUELLE" | "J_MOINS_3" | "J_PLUS_1" | "J_PLUS_7";
  echeanceIds: string[];
  message: string;
  variante?: "principal" | "secondaire";
};

// Ouvre WhatsApp avec le message prêt, et enregistre la relance dans l'historique
export default function RelanceButton({
  href,
  label,
  apprenantId,
  declencheur,
  echeanceIds,
  message,
  variante = "principal",
}: RelanceButtonProps) {
  const [envoye, setEnvoye] = useState(false);
  const [, demarrer] = useTransition();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setEnvoye(true);
        demarrer(() => enregistrerRelance({ apprenantId, declencheur, echeanceIds, message }));
      }}
      className={`flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap ${
        envoye
          ? "bg-success-soft text-success"
          : variante === "principal"
            ? "bg-success text-white hover:opacity-90"
            : "border border-border bg-surface-200 text-ink hover:bg-surface-100"
      }`}
    >
      {envoye ? <Check size={16} aria-hidden="true" /> : <MessageCircle size={16} aria-hidden="true" />}
      {envoye ? "Relancé" : label}
    </a>
  );
}
