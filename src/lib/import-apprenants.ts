import "server-only";
import ExcelJS from "exceljs";
import { normaliserTelephone } from "@/lib/telephone";

// ─── Colonnes reconnues ────────────────────────────
// Les en-têtes sont comparés sans accents, sans espaces ni ponctuation :
// « Téléphone WhatsApp », « TEL », « whatsapp » sont tous reconnus.

type Champ =
  | "prenom"
  | "nom"
  | "nomComplet"
  | "telephone"
  | "email"
  | "dateNaissance"
  | "lieuNaissance"
  | "sexe"
  | "pieceIdentite"
  | "tuteurNom"
  | "tuteurTelephone"
  | "dejaPaye";

const SYNONYMES: Record<Champ, string[]> = {
  prenom: ["prenom", "prenoms", "firstname"],
  nom: ["nom", "nomdefamille", "lastname"],
  nomComplet: ["nomcomplet", "nometprenom", "prenometnom", "nomprenom", "prenomnom", "apprenant", "etudiant"],
  telephone: ["telephone", "tel", "whatsapp", "telephonewhatsapp", "portable", "numero", "contact", "mobile"],
  email: ["email", "mail", "adresseemail", "courriel", "adressemail"],
  dateNaissance: ["datedenaissance", "datenaissance", "naissance", "nele", "neele", "nee"],
  lieuNaissance: ["lieudenaissance", "lieunaissance", "lieu"],
  sexe: ["sexe", "genre"],
  pieceIdentite: ["piecedidentite", "pieceidentite", "cni", "piece", "passeport", "numerocni"],
  tuteurNom: ["tuteur", "parent", "garant", "nomdututeur", "nomtuteur", "nomduparent"],
  tuteurTelephone: [
    "telephonetuteur",
    "teltuteur",
    "telephonedututeur",
    "telephoneparent",
    "telephoneduparent",
    "telparent",
    "contacttuteur",
    "contactparent",
  ],
  dejaPaye: ["dejapaye", "montantpaye", "montantdejapaye", "paye", "versement", "verse", "acompte"],
};

function normaliserEntete(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function champDeLEntete(entete: string): Champ | null {
  const cle = normaliserEntete(entete);
  for (const [champ, liste] of Object.entries(SYNONYMES) as [Champ, string[]][]) {
    if (liste.includes(cle)) return champ;
  }
  return null;
}

// ─── Lecture du fichier (.xlsx ou .csv) ────────────

type LigneBrute = Partial<Record<Champ, string>>;

function texteCellule(valeur: ExcelJS.CellValue): string {
  if (valeur === null || valeur === undefined) return "";
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  if (typeof valeur === "object") {
    if ("text" in valeur && typeof valeur.text === "string") return valeur.text; // lien
    if ("richText" in valeur) return valeur.richText.map((r) => r.text).join("");
    if ("result" in valeur) return texteCellule(valeur.result as ExcelJS.CellValue); // formule
    return "";
  }
  return String(valeur).trim();
}

// Une ligne du fichier avec son vrai numéro (celui qu'on voit dans Excel)
type LigneTableau = { numero: number; cellules: string[] };

// CSV simple : séparateur « ; » (Excel français) ou « , », guillemets gérés
function lireCsv(contenu: string): LigneTableau[] {
  const lignes = contenu
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((texte, i) => ({ texte, numero: i + 1 }))
    .filter((l) => l.texte.trim() !== "");
  if (lignes.length === 0) return [];
  const premiere = lignes[0].texte;
  const separateur = (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";

  return lignes.map(({ texte: ligne, numero }) => {
    const cellules: string[] = [];
    let courante = "";
    let entreGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') {
        if (entreGuillemets && ligne[i + 1] === '"') {
          courante += '"';
          i++;
        } else {
          entreGuillemets = !entreGuillemets;
        }
      } else if (c === separateur && !entreGuillemets) {
        cellules.push(courante.trim());
        courante = "";
      } else {
        courante += c;
      }
    }
    cellules.push(courante.trim());
    return { numero, cellules };
  });
}

async function lireTableau(contenu: ArrayBuffer, nomFichier: string): Promise<LigneTableau[]> {
  if (nomFichier.toLowerCase().endsWith(".csv")) {
    return lireCsv(new TextDecoder("utf-8").decode(contenu));
  }
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(contenu);
  const feuille = classeur.worksheets[0];
  if (!feuille) return [];

  const tableau: LigneTableau[] = [];
  feuille.eachRow({ includeEmpty: false }, (row) => {
    const valeurs = row.values as ExcelJS.CellValue[]; // index 0 vide (colonnes à partir de 1)
    tableau.push({ numero: row.number, cellules: valeurs.slice(1).map(texteCellule) });
  });
  return tableau;
}

export type LigneLue = { numero: number; valeurs: LigneBrute };

export type LectureFichier = { lignes: LigneLue[]; colonnesReconnues: Champ[]; colonnesIgnorees: string[] };

export async function lireFichierApprenants(contenu: ArrayBuffer, nomFichier: string): Promise<LectureFichier> {
  const tableau = await lireTableau(contenu, nomFichier);

  // La ligne d'en-têtes est la première qui contient au moins 2 colonnes reconnues
  // (un titre au-dessus du tableau est donc toléré)
  const indexEntete = tableau.findIndex((l) => l.cellules.filter((c) => champDeLEntete(c)).length >= 2);
  if (indexEntete === -1) {
    return { lignes: [], colonnesReconnues: [], colonnesIgnorees: [] };
  }

  const entetes = tableau[indexEntete].cellules;
  const correspondance = entetes.map(champDeLEntete);
  const lignes = tableau
    .slice(indexEntete + 1)
    .filter((l) => l.cellules.some((c) => c !== ""))
    .map((l) => {
      const valeurs: LigneBrute = {};
      correspondance.forEach((champ, i) => {
        if (champ && l.cellules[i]) valeurs[champ] = l.cellules[i];
      });
      return { numero: l.numero, valeurs };
    });

  return {
    lignes,
    colonnesReconnues: [...new Set(correspondance.filter((c): c is Champ => c !== null))],
    colonnesIgnorees: entetes.filter((e, i) => e && !correspondance[i]),
  };
}

// ─── Vérification d'une ligne ──────────────────────

export type LigneImport = {
  numero: number; // numéro de ligne dans le fichier (pour l'utilisateur)
  prenom: string;
  nom: string;
  telephone: string; // normalisé +221 …
  email: string | null;
  dateNaissance: string | null; // AAAA-MM-JJ
  lieuNaissance: string | null;
  sexe: "F" | "M" | null;
  pieceIdentite: string | null;
  tuteurNom: string | null;
  tuteurTelephone: string | null;
  dejaPaye: number;
  statut: "OK" | "ERREUR" | "DOUBLON";
  message: string | null;
};

function lireDateNaissance(texte: string | undefined): string | null {
  if (!texte) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texte)) return texte;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(texte); // 12/03/2003
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return null;
}

function lireSexe(texte: string | undefined): "F" | "M" | null {
  const t = normaliserEntete(texte ?? "");
  if (["f", "feminin", "femme", "fille"].includes(t)) return "F";
  if (["m", "masculin", "homme", "garcon", "h"].includes(t)) return "M";
  return null;
}

function lireMontant(texte: string | undefined): number {
  const chiffres = (texte ?? "").replace(/[^\d]/g, "");
  return chiffres ? Math.min(Number(chiffres), 100_000_000) : 0;
}

export function verifierLigne(brute: LigneBrute, numero: number): LigneImport {
  let prenom = brute.prenom?.trim() ?? "";
  let nom = brute.nom?.trim() ?? "";
  // Une seule colonne « Nom complet » : le dernier mot est le nom, le reste le prénom
  // (un seul mot = on ne sait pas si c'est le prénom : il sera signalé « prénom manquant »)
  if (!prenom && !nom && brute.nomComplet) {
    const mots = brute.nomComplet.trim().split(/\s+/);
    nom = mots.pop() ?? "";
    prenom = mots.join(" ");
  }

  const telephone = brute.telephone ? normaliserTelephone(brute.telephone) : null;
  const tuteurTelephone = brute.tuteurTelephone ? normaliserTelephone(brute.tuteurTelephone) : null;
  const email = brute.email?.trim().toLowerCase() || null;

  const erreurs: string[] = [];
  if (!prenom) erreurs.push("prénom manquant");
  if (!nom) erreurs.push("nom manquant");
  if (!brute.telephone) erreurs.push("téléphone manquant");
  else if (!telephone) erreurs.push(`téléphone invalide (${brute.telephone})`);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.push("e-mail invalide");

  return {
    numero,
    prenom: prenom.slice(0, 60),
    nom: nom.slice(0, 60),
    telephone: telephone ?? brute.telephone ?? "",
    email,
    dateNaissance: lireDateNaissance(brute.dateNaissance),
    lieuNaissance: brute.lieuNaissance?.slice(0, 80) || null,
    sexe: lireSexe(brute.sexe),
    pieceIdentite: brute.pieceIdentite?.slice(0, 40) || null,
    tuteurNom: brute.tuteurNom?.slice(0, 80) || null,
    tuteurTelephone,
    dejaPaye: lireMontant(brute.dejaPaye),
    statut: erreurs.length ? "ERREUR" : "OK",
    message: erreurs.length ? erreurs.join(", ") : null,
  };
}

export const LIBELLES_CHAMPS: Record<Champ, string> = {
  prenom: "Prénom",
  nom: "Nom",
  nomComplet: "Nom complet",
  telephone: "Téléphone",
  email: "E-mail",
  dateNaissance: "Date de naissance",
  lieuNaissance: "Lieu de naissance",
  sexe: "Sexe",
  pieceIdentite: "Pièce d'identité",
  tuteurNom: "Tuteur",
  tuteurTelephone: "Téléphone du tuteur",
  dejaPaye: "Déjà payé",
};
