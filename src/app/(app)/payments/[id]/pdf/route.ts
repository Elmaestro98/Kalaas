import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { chargerRecu } from "@/lib/recu-donnees";
import RecuPdf from "@/lib/pdf/recu-pdf";

const formateurHeure = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { institut, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;

  // Filtré par établissement : impossible de télécharger le reçu d'un autre institut
  const recu = await chargerRecu(db, id);
  if (!recu) {
    return new Response("Reçu introuvable", { status: 404 });
  }

  const pdf = await renderToBuffer(
    createElement(RecuPdf, {
      recu,
      heure: formateurHeure.format(recu.date),
      etablissement: {
        nom: institut.nom,
        coordonnees: [[institut.adresse, institut.ville].filter(Boolean).join(", "), institut.telephone]
          .filter(Boolean)
          .join(" - "),
        mentions: [institut.ninea && `NINEA ${institut.ninea}`, institut.rccm && `RCCM ${institut.rccm}`]
          .filter(Boolean)
          .join(" - "),
        piedRecu: institut.piedRecu,
      },
    }) as ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${recu.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
