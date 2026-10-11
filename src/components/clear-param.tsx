"use client";

import { useEffect } from "react";

// Retire un paramètre de l'adresse (ex. ?nouveau=1) une fois le bandeau affiché :
// il ne réapparaît plus quand la page se rafraîchit après une autre action.
export default function ClearParam({ nom }: { nom: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(nom)) {
      url.searchParams.delete(nom);
      window.history.replaceState(window.history.state, "", url);
    }
  }, [nom]);

  return null;
}
