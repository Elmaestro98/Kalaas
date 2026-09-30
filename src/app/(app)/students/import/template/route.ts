import ExcelJS from "exceljs";
import { exigerRole } from "@/lib/tenant";

// Modèle Excel à remplir, avec deux exemples et une feuille d'aide
export async function GET() {
  await exigerRole("DIRECTEUR", "CAISSIER");

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Kalaas";

  const feuille = classeur.addWorksheet("Apprenants");
  feuille.columns = [
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Téléphone", key: "telephone", width: 16 },
    { header: "E-mail", key: "email", width: 26 },
    { header: "Date de naissance", key: "naissance", width: 18 },
    { header: "Lieu de naissance", key: "lieu", width: 18 },
    { header: "Sexe", key: "sexe", width: 8 },
    { header: "Pièce d'identité", key: "piece", width: 18 },
    { header: "Tuteur", key: "tuteur", width: 20 },
    { header: "Téléphone tuteur", key: "telTuteur", width: 18 },
    { header: "Déjà payé", key: "dejaPaye", width: 12 },
  ];
  feuille.addRow({
    prenom: "Moussa",
    nom: "Ndiaye",
    telephone: "77 645 28 19",
    email: "moussa.ndiaye@exemple.sn",
    naissance: "12/03/2003",
    lieu: "Saint-Louis",
    sexe: "M",
    piece: "1751200102847",
    tuteur: "Amadou Ndiaye (père)",
    telTuteur: "78 320 15 44",
    dejaPaye: 75000,
  });
  feuille.addRow({ prenom: "Awa", nom: "Diop", telephone: "78 312 90 44", sexe: "F", dejaPaye: 0 });

  const entete = feuille.getRow(1);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1B2A" } };
  feuille.views = [{ state: "frozen", ySplit: 1 }];
  feuille.getColumn("telephone").numFmt = "@";
  feuille.getColumn("telTuteur").numFmt = "@";

  const aide = classeur.addWorksheet("Aide");
  aide.columns = [{ width: 22 }, { width: 80 }];
  [
    ["Colonne", "Comment la remplir"],
    ["Prénom, Nom", "Obligatoires. Une seule colonne « Nom complet » est aussi acceptée."],
    ["Téléphone", "Obligatoire : numéro WhatsApp sénégalais (77 123 45 67). Sert à repérer les doublons."],
    ["Date de naissance", "Format JJ/MM/AAAA (ex. 12/03/2003). Facultatif."],
    ["Sexe", "F ou M. Facultatif."],
    ["Déjà payé", "Montant déjà versé AVANT Kalaas (en FCFA). Réparti sur les plus anciennes échéances. Facultatif."],
    ["", "Supprimez les deux lignes d'exemple avant l'import. Les colonnes inconnues sont ignorées."],
  ].forEach((l, i) => {
    const ligne = aide.addRow(l);
    if (i === 0) ligne.font = { bold: true };
  });

  const contenu = await classeur.xlsx.writeBuffer();
  return new Response(new Uint8Array(contenu as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-apprenants-kalaas.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
