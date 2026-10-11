import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { exigerRole } from "@/lib/tenant";
import { lireMois } from "@/lib/heures-donnees";
import { LABEL_MODE } from "@/lib/paiements";
import { evolution, rapportDuMois, situationImpayes } from "@/lib/rapports-donnees";

function entete(feuille: ExcelJS.Worksheet, colonnes: string[]) {
  const ligne = feuille.addRow(colonnes);
  ligne.font = { bold: true, color: { argb: "FFFFFFFF" } };
  ligne.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1B2A" } };
  });
}

// Rapport financier du mois en Excel : synthèse, détail par mode et formation, 6 derniers mois
export async function GET(request: NextRequest) {
  const { institut, db } = await exigerRole("DIRECTEUR");
  const { debut, fin, cle } = lireMois(request.nextUrl.searchParams.get("mois") ?? undefined);

  const [rapport, impayes, historique] = await Promise.all([
    rapportDuMois(db, debut, fin, cle),
    situationImpayes(db),
    evolution(db, fin, 6),
  ]);

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Kalaas";

  const synthese = classeur.addWorksheet("Synthèse");
  synthese.addRow([`${institut.nom} — Rapport financier ${cle}`]).font = { bold: true, size: 13 };
  synthese.addRow(["Paiements annulés exclus. Paie comptée le mois où elle a été versée."]);
  synthese.addRow([]);
  entete(synthese, ["Indicateur", "Montant (FCFA)"]);
  synthese.addRow(["Encaissé", rapport.encaisse]);
  synthese.addRow(["Paie des vacataires versée", rapport.paieVersee]);
  synthese.addRow(["Solde du mois", rapport.solde]).font = { bold: true };
  synthese.addRow(["Paie validée encore à payer", rapport.paieAPayer]);
  synthese.addRow(["Paiements annulés", rapport.annule]);
  synthese.addRow([]);
  synthese.addRow(["Reste à recouvrer (à ce jour)", impayes.resteARecouvrer]);
  synthese.addRow(["dont en retard", impayes.enRetard]);
  synthese.columns = [{ width: 34 }, { width: 18 }];
  synthese.getColumn(2).numFmt = "#,##0";

  const modes = classeur.addWorksheet("Par moyen de paiement");
  entete(modes, ["Moyen", "Nombre", "Montant (FCFA)"]);
  for (const m of rapport.parMode) {
    modes.addRow([LABEL_MODE[m.mode], m.nombre, m.montant]);
  }
  modes.addRow(["Total", rapport.nbPaiements, rapport.encaisse]).font = { bold: true };
  modes.columns = [{ width: 20 }, { width: 10 }, { width: 18 }];
  modes.getColumn(3).numFmt = "#,##0";

  const formations = classeur.addWorksheet("Par formation");
  entete(formations, ["Formation", "Montant (FCFA)"]);
  for (const f of rapport.parFormation) {
    formations.addRow([f.formation, f.montant]);
  }
  formations.columns = [{ width: 40 }, { width: 18 }];
  formations.getColumn(2).numFmt = "#,##0";

  const mois = classeur.addWorksheet("6 derniers mois");
  entete(mois, ["Mois", "Encaissé (FCFA)", "Paie versée (FCFA)", "Solde (FCFA)"]);
  for (const l of historique) {
    mois.addRow([l.cle, l.encaisse, l.paie, l.solde]);
  }
  mois.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }];
  for (const c of [2, 3, 4]) {
    mois.getColumn(c).numFmt = "#,##0";
  }

  const contenu = await classeur.xlsx.writeBuffer();
  return new Response(new Uint8Array(contenu as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rapport-${cle}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
