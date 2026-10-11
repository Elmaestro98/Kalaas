import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatNombre } from "@/lib/format";
import { nombreEnLettres } from "@/lib/lettres";
import { LABEL_MODE, type ModePaiementSaisie } from "@/lib/paiements";
import { formatHeures, type LigneDetailVacation } from "@/lib/paie";

// Les polices intégrées aux PDF ne connaissent ni l'espace fine insécable ni le signe moins typographique :
// on écrit toujours la valeur absolue, le signe est ajouté à part.
function nombrePdf(n: number): string {
  return formatNombre(Math.abs(n)).replace(/[  ]/g, " ");
}

// Couleurs du design system Kalaas
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";
const VERT = "#1F7A4D";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: NAVY },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 12,
  },
  etablissement: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  petit: { fontSize: 8, color: GRIS, marginTop: 2 },
  surtitre: { fontSize: 8, color: GOLD_700, fontFamily: "Helvetica-Bold", letterSpacing: 1, textAlign: "right" },
  numero: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  droite: { textAlign: "right" },
  blocs: { flexDirection: "row", gap: 16, marginTop: 18 },
  bloc: { flex: 1 },
  label: { fontSize: 7.5, color: GRIS, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  valeur: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  tableau: { marginTop: 18 },
  ligneTitre: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDURE, paddingBottom: 4 },
  ligne: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDURE, paddingVertical: 5 },
  colMatiere: { flex: 2 },
  colClasse: { flex: 3 },
  colHeures: { flex: 1, textAlign: "right" },
  entetes: { fontSize: 8, color: GRIS, fontFamily: "Helvetica-Bold" },
  calcul: { marginTop: 14, marginLeft: "auto", width: 260 },
  ligneCalcul: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  ligneNet: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: NAVY,
    marginTop: 4,
    paddingTop: 6,
  },
  netMontant: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  gras: { fontFamily: "Helvetica-Bold" },
  lettres: { marginTop: 14 },
  encadre: { marginTop: 16, backgroundColor: IVOIRE, padding: 10, borderRadius: 3 },
  paye: { color: VERT, fontFamily: "Helvetica-Bold" },
  signatures: { flexDirection: "row", gap: 24, marginTop: 28 },
  cadre: { flex: 1, height: 70, borderWidth: 1, borderColor: BORDURE, borderStyle: "dashed", marginTop: 4 },
  pied: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 6,
  },
});

export type BulletinVacation = {
  numero: string;
  libelleMois: string;
  enseignant: { nom: string; telephone: string | null; specialite: string | null };
  detail: LigneDetailVacation[];
  minutes: number;
  tarifHoraire: number;
  montantBrut: number;
  ajustement: number;
  motifAjustement: string | null;
  montantNet: number;
  valideLe: Date;
  validePar: string;
  paiement: { date: Date; mode: ModePaiementSaisie; reference: string | null; par: string | null } | null;
};

export type BulletinVacationPdfProps = {
  bulletin: BulletinVacation;
  etablissement: { nom: string; coordonnees: string; mentions: string };
};

export default function BulletinVacationPdf({ bulletin: b, etablissement }: BulletinVacationPdfProps) {
  return (
    <Document title={`Bulletin ${b.numero}`} author={etablissement.nom} creator="Kalaas">
      <Page size="A4" style={styles.page}>
        <View style={styles.entete}>
          <View style={{ maxWidth: 280 }}>
            <Text style={styles.etablissement}>{etablissement.nom}</Text>
            {etablissement.coordonnees ? <Text style={styles.petit}>{etablissement.coordonnees}</Text> : null}
            {etablissement.mentions ? <Text style={styles.petit}>{etablissement.mentions}</Text> : null}
          </View>
          <View>
            <Text style={styles.surtitre}>BULLETIN DE VACATION</Text>
            <Text style={styles.numero}>N° {b.numero}</Text>
            <Text style={[styles.petit, styles.droite]}>Période : {b.libelleMois}</Text>
          </View>
        </View>

        <View style={styles.blocs}>
          <View style={styles.bloc}>
            <Text style={styles.label}>PROFESSEUR VACATAIRE</Text>
            <Text style={styles.valeur}>{b.enseignant.nom}</Text>
            <Text style={styles.petit}>
              {[b.enseignant.specialite, b.enseignant.telephone].filter(Boolean).join(" - ") || " "}
            </Text>
          </View>
          <View style={styles.bloc}>
            <Text style={styles.label}>TARIF HORAIRE</Text>
            <Text style={styles.valeur}>{nombrePdf(b.tarifHoraire)} FCFA / heure</Text>
          </View>
        </View>

        <View style={styles.tableau}>
          <View style={styles.ligneTitre}>
            <Text style={[styles.colMatiere, styles.entetes]}>Matière</Text>
            <Text style={[styles.colClasse, styles.entetes]}>Classe</Text>
            <Text style={[styles.colHeures, styles.entetes]}>Heures</Text>
          </View>
          {b.detail.map((d, i) => (
            <View key={i} style={styles.ligne} wrap={false}>
              <Text style={styles.colMatiere}>{d.matiere}</Text>
              <Text style={styles.colClasse}>{d.classe}</Text>
              <Text style={styles.colHeures}>{formatHeures(d.minutes)}</Text>
            </View>
          ))}
          <View style={[styles.ligne, { borderBottomWidth: 0 }]}>
            <Text style={[styles.colMatiere, styles.gras]}>Total</Text>
            <Text style={styles.colClasse} />
            <Text style={[styles.colHeures, styles.gras]}>{formatHeures(b.minutes)}</Text>
          </View>
        </View>

        <View style={styles.calcul} wrap={false}>
          <View style={styles.ligneCalcul}>
            <Text>
              {formatHeures(b.minutes)} x {nombrePdf(b.tarifHoraire)}
            </Text>
            <Text>{nombrePdf(b.montantBrut)} FCFA</Text>
          </View>
          {b.ajustement !== 0 && (
            <View style={styles.ligneCalcul}>
              <Text style={{ maxWidth: 160 }}>
                {b.ajustement < 0 ? "Retenue" : "Prime"}
                {b.motifAjustement ? ` (${b.motifAjustement})` : ""}
              </Text>
              <Text>
                {b.ajustement < 0 ? "- " : "+ "}
                {nombrePdf(b.ajustement)} FCFA
              </Text>
            </View>
          )}
          <View style={styles.ligneNet}>
            <Text style={styles.gras}>Net à payer</Text>
            <Text style={styles.netMontant}>{nombrePdf(b.montantNet)} FCFA</Text>
          </View>
        </View>

        <Text style={styles.lettres}>
          Arrêté le présent bulletin à la somme de{" "}
          <Text style={styles.gras}>
            {nombreEnLettres(b.montantNet)} ({nombrePdf(b.montantNet)}) francs CFA
          </Text>
          .
        </Text>

        <View style={styles.encadre} wrap={false}>
          <Text style={styles.label}>RÈGLEMENT</Text>
          {b.paiement ? (
            <Text style={{ marginTop: 3 }}>
              <Text style={styles.paye}>Payé</Text> le {formatDate(b.paiement.date)} - {LABEL_MODE[b.paiement.mode]}
              {b.paiement.reference ? ` - réf. ${b.paiement.reference}` : ""}
              {b.paiement.par ? ` - par ${b.paiement.par}` : ""}
            </Text>
          ) : (
            <Text style={{ marginTop: 3 }}>Validé, en attente de paiement.</Text>
          )}
          <Text style={styles.petit}>
            Validé le {formatDate(b.valideLe)} par {b.validePar}. Heures comptées : cours dont l&apos;appel a été
            enregistré.
          </Text>
        </View>

        <View style={styles.signatures} wrap={false}>
          <View style={styles.bloc}>
            <Text style={styles.label}>LA DIRECTION (CACHET ET SIGNATURE)</Text>
            <View style={styles.cadre} />
          </View>
          <View style={styles.bloc}>
            <Text style={styles.label}>LE PROFESSEUR (« POUR ACQUIT »)</Text>
            <View style={styles.cadre} />
          </View>
        </View>

        <View style={styles.pied} fixed>
          <Text style={styles.petit}>Document généré électroniquement.</Text>
          <Text style={styles.petit}>Généré avec Kalaas</Text>
        </View>
      </Page>
    </Document>
  );
}
