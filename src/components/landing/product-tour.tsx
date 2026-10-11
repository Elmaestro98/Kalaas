"use client";

import { useEffect, useState } from "react";
import { AppWindow, EcranEmploiDuTemps, EcranEncaissements, EcranTableauDeBord } from "./mockups";
import DemoToaster from "./demo-toaster";

const ONGLETS = [
  { cle: "dashboard", label: "Tableau de bord", titre: "Tableau de bord", Ecran: EcranTableauDeBord },
  { cle: "payments", label: "Encaissements", titre: "Encaissements", Ecran: EcranEncaissements },
  { cle: "timetable", label: "Emplois du temps", titre: "Emplois du temps", Ecran: EcranEmploiDuTemps },
];

const DUREE_MS = 6000;

export default function ProductTour() {
  const [actif, setActif] = useState(0);
  const [manuel, setManuel] = useState(false);

  // Défilement automatique, arrêté dès que le visiteur choisit un onglet
  useEffect(() => {
    if (manuel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const minuteur = setInterval(() => setActif((a) => (a + 1) % ONGLETS.length), DUREE_MS);
    return () => clearInterval(minuteur);
  }, [manuel]);

  const onglet = ONGLETS[actif];

  return (
    <div>
      <div role="tablist" aria-label="Aperçu de l'application" className="mb-4 flex flex-wrap justify-center gap-2">
        {ONGLETS.map((o, i) => (
          <button
            key={o.cle}
            role="tab"
            type="button"
            aria-selected={i === actif}
            aria-controls="apercu-produit"
            onClick={() => {
              setActif(i);
              setManuel(true);
            }}
            className={`h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors ${
              i === actif ? "bg-navy-900 text-white" : "text-ink-muted hover:bg-surface-200 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div id="apercu-produit" role="tabpanel" aria-label={onglet.label} className="relative">
        <AppWindow actif={onglet.cle} titre={onglet.titre}>
          <div key={onglet.cle} className="animate-[apparition_0.4s_ease] motion-reduce:animate-none">
            <onglet.Ecran />
          </div>
        </AppWindow>
        <DemoToaster />
      </div>
    </div>
  );
}
