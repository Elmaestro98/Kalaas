import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { getContexte } from "@/lib/tenant";
import { chargerEmploiDuTemps, type Vue } from "@/lib/emploi-du-temps-donnees";
import EmploiDuTempsPdf from "@/lib/pdf/emploi-du-temps-pdf";

const SURTITRES: Record<Vue, string> = {
  classe: "Emploi du temps",
  enseignant: "Programmation du professeur",
  salle: "Occupation de salle",
};

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Dakar",
});

// « Licence Informatique — L1 » → « licence-informatique-l1 »
function nomDeFichier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(request: NextRequest) {
  const { institut, membre, db } = await getContexte();

  const params = request.nextUrl.searchParams;
  const vueDemandee = params.get("vue");
  const vue: Vue = vueDemandee === "enseignant" || vueDemandee === "salle" ? vueDemandee : "classe";
  const id = params.get("id") ?? "";

  // Un formateur ne peut télécharger que son propre emploi du temps
  if (membre.role === "FORMATEUR") {
    const maFiche = await db.enseignant.findFirst({ where: { membreId: membre.id } });
    if (vue !== "enseignant" || !maFiche || id !== maFiche.id) {
      return new Response("Accès refusé", { status: 403 });
    }
  }

  // Filtré par établissement : impossible de télécharger celui d'un autre institut
  const emploi = await chargerEmploiDuTemps(db, vue, id);
  if (!emploi) {
    return new Response("Emploi du temps introuvable", { status: 404 });
  }

  // EmploiDuTempsPdf renvoie un <Document> : on l'indique à TypeScript
  const pdf = await renderToBuffer(
    createElement(EmploiDuTempsPdf, {
      etablissement: institut.nom,
      coordonnees: [institut.adresse, institut.ville, institut.telephone].filter(Boolean).join(" · "),
      surtitre: SURTITRES[vue],
      titre: emploi.titre,
      sousTitre: emploi.sousTitre,
      creneaux: emploi.creneaux,
      genereLe: formateurDate.format(new Date()),
    }) as ReactElement<DocumentProps>,
  );

  const fichier = `emploi-du-temps-${nomDeFichier(emploi.titre) || "kalaas"}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fichier}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
