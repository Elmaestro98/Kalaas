import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { etatDesHeures, lireMois } from "@/lib/heures-donnees";

// État des heures du mois en Excel : une feuille de synthèse et une feuille de détail
export async function GET(request: NextRequest) {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const { debut, fin, cle } = lireMois(request.nextUrl.searchParams.get("mois") ?? undefined);
  const lignes = await etatDesHeures(db, debut, fin);

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Kalaas";

  const synthese = classeur.addWorksheet("Synthèse");
  synthese.addRow([`${institut.nom} — État des heures ${cle}`]).font = { bold: true, size: 13 };
  synthese.addRow(["Heures réalisées = cours dont l'appel a été enregistré. Montant = heures × tarif horaire."]);
  synthese.addRow([]);
  const entete = synthese.addRow([
    "Professeur",
    "Statut",
    "Cours faits",
    "Heures réalisées",
    "Tarif horaire (FCFA)",
    "Montant (FCFA)",
    "Cours sans appel",
  ]);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1B2A" } };
  });
  for (const l of lignes) {
    synthese.addRow([
      l.nom,
      l.statut === "VACATAIRE" ? "Vacataire" : "Permanent",
      l.coursFaits,
      l.heures,
      l.tarifHoraire ?? "",
      l.montant ?? "",
      l.coursSansAppel,
    ]);
  }
  const total = synthese.addRow([
    "Total",
    "",
    lignes.reduce((s, l) => s + l.coursFaits, 0),
    Math.round(lignes.reduce((s, l) => s + l.heures, 0) * 10) / 10,
    "",
    lignes.reduce((s, l) => s + (l.montant ?? 0), 0),
    lignes.reduce((s, l) => s + l.coursSansAppel, 0),
  ]);
  total.font = { bold: true };
  synthese.columns = [{ width: 28 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 16 }];
  synthese.getColumn(5).numFmt = "#,##0";
  synthese.getColumn(6).numFmt = "#,##0";

  const detail = classeur.addWorksheet("Détail");
  detail.addRow(["Professeur", "Matière", "Classe", "Heures"]).font = { bold: true };
  for (const l of lignes) {
    for (const d of l.detail) {
      detail.addRow([l.nom, d.matiere, d.classe, d.heures]);
    }
  }
  detail.columns = [{ width: 28 }, { width: 28 }, { width: 44 }, { width: 10 }];

  const contenu = await classeur.xlsx.writeBuffer();
  return new Response(new Uint8Array(contenu as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="etat-des-heures-${cle}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
