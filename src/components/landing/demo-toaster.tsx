"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CalendarCheck, Check, FileText, Lock, MessageCircle, type LucideIcon } from "lucide-react";

// Notifications de démonstration : ce que l'application affiche au fil de la journée (données fictives)
const EVENEMENTS: { icone: LucideIcon; ton: string; titre: string; detail: string }[] = [
  { icone: Check, ton: "bg-success-soft text-success", titre: "Paiement enregistré", detail: "Mariama Diallo · 65 000 FCFA · Wave" },
  { icone: MessageCircle, ton: "bg-success-soft text-success", titre: "Reçu envoyé sur WhatsApp", detail: "REC-2026-01285 · Mariama Diallo" },
  { icone: CalendarCheck, ton: "bg-info-soft text-info", titre: "Appel validé", detail: "Licence 2 · Gestion · 28 présents, 2 absents" },
  { icone: BellRing, ton: "bg-warning-soft text-warning", titre: "Relance préparée", detail: "Babacar Thiam · 130 000 FCFA · 34 jours de retard" },
  { icone: FileText, ton: "bg-gold-100 text-gold-700", titre: "Bulletin de vacation validé", detail: "VAC-2026-00012 · M. Diop · 62 500 FCFA" },
  { icone: Lock, ton: "bg-navy-900 text-gold-500", titre: "Caisse clôturée", detail: "Attendu 412 000 · Compté 412 000 · Juste" },
];

const INTERVALLE_MS = 3200;
const DUREE_VIE_MS = 7000;
const DUREE_SORTIE_MS = 400; // doit correspondre à la durée de toast-sortie ci-dessous (0.4s)
const RELANCE_APRES_PAUSE_MS = 2500;
const MAX_VISIBLES = 3;

type Toast = { id: number; index: number; sortie: boolean };

export default function DemoToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pause, setPause] = useState(false);
  const prochain = useRef(0);
  // Copie à jour de la liste, lisible depuis les minuteurs
  const liste = useRef<Toast[]>([]);

  useEffect(() => {
    if (pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const minuteurs: ReturnType<typeof setTimeout>[] = [];
    const maj = (calcul: (t: Toast[]) => Toast[]) => {
      liste.current = calcul(liste.current);
      setToasts(liste.current);
    };

    // Fondu de sortie, puis retrait de la liste une fois l'animation terminée
    const fermer = (id: number) => {
      maj((t) => t.map((x) => (x.id === id ? { ...x, sortie: true } : x)));
      minuteurs.push(setTimeout(() => maj((t) => t.filter((x) => x.id !== id)), DUREE_SORTIE_MS));
    };

    // Après une pause au survol : les notifications restées affichées repartent
    for (const t of liste.current) {
      minuteurs.push(setTimeout(() => (t.sortie ? maj((l) => l.filter((x) => x.id !== t.id)) : fermer(t.id)), t.sortie ? 0 : RELANCE_APRES_PAUSE_MS));
    }

    const ajouter = () => {
      const id = prochain.current++;
      maj((t) => [...t, { id, index: id % EVENEMENTS.length, sortie: false }]);
      minuteurs.push(setTimeout(() => fermer(id), DUREE_VIE_MS));

      // Trop de notifications : la plus ancienne s'efface en douceur
      const visibles = liste.current.filter((x) => !x.sortie);
      if (visibles.length > MAX_VISIBLES) fermer(visibles[0].id);
    };

    const premier = setTimeout(ajouter, 1200);
    const minuteur = setInterval(ajouter, INTERVALLE_MS);
    return () => {
      clearTimeout(premier);
      clearInterval(minuteur);
      minuteurs.forEach(clearTimeout);
    };
  }, [pause]);

  return (
    // Décoratif : les lecteurs d'écran ne lisent pas ces notifications de démonstration
    <div
      aria-hidden="true"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      className="pointer-events-auto absolute right-3 bottom-3 z-10 flex w-[18rem] flex-col items-end gap-2 sm:right-5 sm:bottom-5 sm:w-[21.5rem]"
    >
      {toasts.map((t) => {
        const e = EVENEMENTS[t.index];
        return (
          <div
            key={t.id}
            className={`flex w-full items-start ${
              t.sortie ? "animate-[toast-sortie_0.4s_ease-in_forwards]" : "animate-[toast-entree_0.45s_cubic-bezier(0.2,0.8,0.2,1)]"
            } gap-3 rounded-lg border border-border bg-surface-200/95 p-3 shadow-[0_12px_32px_-12px_rgba(13,27,42,0.35)] backdrop-blur`}
          >
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${e.ton}`}>
              <e.icone size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-ink">{e.titre}</span>
              <span className="block text-[11px] leading-snug text-ink-muted">{e.detail}</span>
            </span>
            <span className="ml-auto shrink-0 text-[10px] text-ink-muted">à l&apos;instant</span>
          </div>
        );
      })}
    </div>
  );
}
