import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { nomEnseignant } from "@/lib/enseignants";
import { lireMois } from "@/lib/heures-donnees";
import type { LigneDetailVacation } from "@/lib/paie";
import BulletinVacationPdf from "@/lib/pdf/bulletin-vacation-pdf";

const formateurMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { institut, db } = await exigerRole("DIRECTEUR", "CAISSIER");
  const { id } = await params;

  // Filtré par établissement : impossible de télécharger le bulletin d'un autre institut
  const vacation = await db.vacation.findFirst({
    where: { id },
    include: {
      enseignant: true,
      valideePar: { include: { utilisateur: { select: { nom: true } } } },
      payeePar: { include: { utilisateur: { select: { nom: true } } } },
    },
  });
  if (!vacation) {
    return new Response("Bulletin introuvable", { status: 404 });
  }

  const pdf = await renderToBuffer(
    createElement(BulletinVacationPdf, {
      bulletin: {
        numero: vacation.numero,
        libelleMois: formateurMois.format(lireMois(vacation.mois).debut),
        enseignant: {
          nom: nomEnseignant(vacation.enseignant),
          telephone: vacation.enseignant.telephone,
          specialite: vacation.enseignant.specialite,
        },
        detail: vacation.detail as LigneDetailVacation[],
        minutes: vacation.minutes,
        tarifHoraire: vacation.tarifHoraire,
        montantBrut: vacation.montantBrut,
        ajustement: vacation.ajustement,
        motifAjustement: vacation.motifAjustement,
        montantNet: vacation.montantNet,
        valideLe: vacation.createdAt,
        validePar: vacation.valideePar.utilisateur.nom,
        paiement:
          vacation.statut === "PAYEE" && vacation.payeeLe && vacation.modePaiement
            ? {
                date: vacation.payeeLe,
                mode: vacation.modePaiement,
                reference: vacation.referencePaiement,
                par: vacation.payeePar?.utilisateur.nom ?? null,
              }
            : null,
      },
      etablissement: {
        nom: institut.nom,
        coordonnees: [[institut.adresse, institut.ville].filter(Boolean).join(", "), institut.telephone]
          .filter(Boolean)
          .join(" - "),
        mentions: [institut.ninea && `NINEA ${institut.ninea}`, institut.rccm && `RCCM ${institut.rccm}`]
          .filter(Boolean)
          .join(" - "),
      },
    }) as ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bulletin-${vacation.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
