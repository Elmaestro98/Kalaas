import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import type { ContenuDocument } from "@/lib/documents";
import AttestationPdf from "@/lib/pdf/attestation-pdf";

// Retélécharge un document déjà délivré (même numéro, même contenu figé)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { institut, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;

  // Filtré par établissement : impossible de télécharger le document d'un autre institut
  const document = await db.documentDelivre.findFirst({ where: { id } });
  if (!document) {
    return new Response("Document introuvable", { status: 404 });
  }

  const pdf = await renderToBuffer(
    createElement(AttestationPdf, {
      etablissement: {
        nom: institut.nom,
        coordonnees: [[institut.adresse, institut.ville].filter(Boolean).join(", "), institut.telephone]
          .filter(Boolean)
          .join(" - "),
        mentions: [institut.ninea && `NINEA ${institut.ninea}`, institut.rccm && `RCCM ${institut.rccm}`]
          .filter(Boolean)
          .join(" - "),
        ville: institut.ville,
      },
      type: document.type,
      numero: document.numero,
      motif: document.motif,
      contenu: document.contenu as ContenuDocument,
      dateDelivrance: document.createdAt,
    }) as ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
