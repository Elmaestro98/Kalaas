import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { chargerBulletins } from "@/lib/bulletins-donnees";
import BulletinScolairePdf from "@/lib/pdf/bulletin-scolaire-pdf";

// Nom de fichier sans accents ni espaces : « DIOP Awa » → « diop-awa »
function slug(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET /grades/report-cards/pdf?session=ID&periode=1                → bulletins de toute la classe (une page par élève)
// GET /grades/report-cards/pdf?session=ID&periode=1&inscription=ID → bulletin d'un seul élève
export async function GET(request: NextRequest) {
  const { institut, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const sessionId = request.nextUrl.searchParams.get("session");
  const periode = Number(request.nextUrl.searchParams.get("periode"));
  const inscriptionId = request.nextUrl.searchParams.get("inscription") ?? undefined;
  if (!sessionId || !Number.isInteger(periode)) {
    return new Response("Classe ou période manquante", { status: 400 });
  }

  // Filtré par établissement : impossible d'obtenir les notes d'un autre établissement
  const donnees = await chargerBulletins(db, sessionId, institut.decoupageScolaire, periode, inscriptionId);
  if (!donnees || donnees.bulletins.length === 0) {
    return new Response("Aucun bulletin à éditer", { status: 404 });
  }
  if (donnees.resultats.evaluations[periode] === 0) {
    return new Response("Aucune évaluation pour cette période", { status: 404 });
  }

  const pdf = await renderToBuffer(
    createElement(BulletinScolairePdf, {
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
      resultats: donnees.resultats,
      decoupage: institut.decoupageScolaire,
      periode,
      bulletins: donnees.bulletins,
      dateEdition: new Date(),
    }) as ReactElement<DocumentProps>,
  );

  const nom = inscriptionId
    ? `bulletin-p${periode}-${slug(donnees.bulletins[0].eleve.nom)}`
    : `bulletins-p${periode}-${slug(donnees.enTete.classe)}`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
