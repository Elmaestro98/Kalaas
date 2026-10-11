"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

// Même nom que COOKIE_FLASH dans src/lib/flash.ts (fichier réservé au serveur)
const COOKIE_FLASH = "kalaas_flash";
const DUREE_AFFICHAGE_MS = 4500;

type Flash = { id: string; message: string };

function mouvementReduit() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Notification({ flash, retirer }: { flash: Flash; retirer: (id: string) => void }) {
  const [sortie, setSortie] = useState(false);

  const fermer = () => (mouvementReduit() ? retirer(flash.id) : setSortie(true));

  useEffect(() => {
    const minuteur = setTimeout(() => (mouvementReduit() ? retirer(flash.id) : setSortie(true)), DUREE_AFFICHAGE_MS);
    return () => clearTimeout(minuteur);
  }, [flash.id, retirer]);

  return (
    <div
      onAnimationEnd={() => sortie && retirer(flash.id)}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-surface-200 p-4 shadow-[0_12px_32px_-12px_rgba(13,27,42,0.35)] motion-reduce:animate-none ${
        sortie ? "animate-[toast-sortie_0.3s_ease-in_forwards]" : "animate-[toast-entree_0.4s_cubic-bezier(0.2,0.8,0.2,1)]"
      }`}
    >
      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-ink">{flash.message}</p>
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer la notification"
        className="-m-1 cursor-pointer rounded p-1 text-ink-muted hover:bg-surface-100 hover:text-ink"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// Affiche le message de confirmation déposé par une action serveur (voir src/lib/flash.ts)
export default function Toaster({ flash }: { flash: Flash | null }) {
  const [notifications, setNotifications] = useState<Flash[]>([]);
  const [dernierVu, setDernierVu] = useState<string | null>(null);

  // Nouveau message reçu du serveur : on l'ajoute une seule fois
  if (flash && flash.id !== dernierVu) {
    setDernierVu(flash.id);
    setNotifications((n) => [...n, flash].slice(-3));
  }

  // Le message est affiché : le cookie peut disparaître
  const idFlash = flash?.id;
  useEffect(() => {
    if (idFlash) document.cookie = `${COOKIE_FLASH}=; Max-Age=0; path=/`;
  }, [idFlash]);

  const [retirer] = useState(() => (id: string) => setNotifications((n) => n.filter((x) => x.id !== id)));

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col gap-2 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96 print:hidden"
    >
      {notifications.map((n) => (
        <Notification key={n.id} flash={n} retirer={retirer} />
      ))}
    </div>
  );
}
