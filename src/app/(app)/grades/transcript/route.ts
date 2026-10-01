import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { chargerReleves } from "@/lib/notes-donnees";
import ReleveNotesPdf from "@/lib/pdf/releve-notes-pdf";

// Nom de fichier sans accents ni espaces : « DIOP Awa » → « diop-awa »
function slug(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET /grades/transcript?session=ID            → relevés de toute la classe (une page par étudiant)
// GET /grades/transcript?session=ID&inscription=ID → relevé d'un seul étudiant
export async function GET(request: NextRequest) {
  const { institut, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const sessionId = request.nextUrl.searchParams.get("session");
  const inscriptionId = request.nextUrl.searchParams.get("inscription") ?? undefined;
  if (!sessionId) {
    return new Response("Classe manquante", { status: 400 });
  }

  // Filtré par établissement : impossible d'obtenir les notes d'un autre institut
  const donnees = await chargerReleves(db, sessionId, inscriptionId);
  if (!donnees || donnees.releves.length === 0) {
    return new Response("Aucun relevé à éditer", { status: 404 });
  }
  if (donnees.resultats.nbEvaluations === 0) {
    return new Response("Aucune évaluation dans cette classe", { status: 404 });
  }

  const pdf = await renderToBuffer(
    createElement(ReleveNotesPdf, {
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
      enTete: donnees.enTete,
      blocs: donnees.resultats.blocs,
      lmd: donnees.resultats.lmd,
      definitif: donnees.resultats.toutVerrouille,
      releves: donnees.releves,
      dateEdition: new Date(),
    }) as ReactElement<DocumentProps>,
  );

  const nom = inscriptionId
    ? `releve-${slug(donnees.releves[0].apprenant.nom)}`
    : `releves-${slug(`${donnees.enTete.formation} ${donnees.enTete.classe}`)}`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
