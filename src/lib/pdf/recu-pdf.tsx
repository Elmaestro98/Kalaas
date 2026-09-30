import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatNombre } from "@/lib/format";
import { nombreEnLettres } from "@/lib/lettres";
import { LABEL_MODE } from "@/lib/paiements";
import type { Recu } from "@/lib/recu-donnees";

// Les polices intégrées aux PDF ne connaissent pas l'espace fine insécable
// utilisée par le format français (15 000) : on la remplace par une espace normale.
function nombrePdf(n: number): string {
  return formatNombre(n).replace(/[  ]/g, " ");
}

// Couleurs du design system Kalaas
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";
const ROUGE = "#B42318";

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 9, color: NAVY },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 10,
  },
  etablissement: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  petit: { fontSize: 7.5, color: GRIS, marginTop: 2 },
  surtitre: { fontSize: 7.5, color: GOLD_700, fontFamily: "Helvetica-Bold", letterSpacing: 1, textAlign: "right" },
  numero: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  droite: { textAlign: "right" },
  blocs: { flexDirection: "row", gap: 12, marginTop: 14 },
  bloc: { flex: 1 },
  label: { fontSize: 7, color: GRIS, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  valeur: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  tableau: { marginTop: 14 },
  ligneTitre: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDURE, paddingBottom: 4 },
  ligne: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDURE, paddingVertical: 5 },
  colDesignation: { flex: 3 },
  colDate: { flex: 1.4 },
  colMontant: { flex: 1.4, textAlign: "right" },
  entetes: { fontSize: 7.5, color: GRIS, fontFamily: "Helvetica-Bold" },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  totalMontant: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  lettres: { marginTop: 10, fontSize: 9 },
  gras: { fontFamily: "Helvetica-Bold" },
  encadre: { flexDirection: "row", gap: 12, marginTop: 14, backgroundColor: IVOIRE, padding: 10, borderRadius: 3 },
  ligneSituation: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  pied: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 8,
  },
  cachet: { width: 130, height: 44, borderWidth: 1, borderColor: BORDURE, borderStyle: "dashed", marginTop: 4 },
  filigrane: {
    position: "absolute",
    top: 230,
    left: 60,
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: ROUGE,
    opacity: 0.15,
    transform: "rotate(-20deg)",
  },
  bandeauAnnule: { marginTop: 10, padding: 6, backgroundColor: "#FDE8E6", color: ROUGE, fontSize: 8.5 },
});

export type RecuPdfProps = {
  recu: Recu;
  etablissement: {
    nom: string;
    coordonnees: string;
    mentions: string;
    piedRecu: string | null;
  };
  heure: string;
};

export default function RecuPdf({ recu, etablissement, heure }: RecuPdfProps) {
  const s = recu.situation;

  return (
    <Document title={`Reçu ${recu.numero}`} author={etablissement.nom} creator="Kalaas">
      <Page size="A5" style={styles.page}>
        {recu.annulation && <Text style={styles.filigrane}>ANNULÉ</Text>}

        <View style={styles.entete}>
          <View style={{ maxWidth: 200 }}>
            <Text style={styles.etablissement}>{etablissement.nom}</Text>
            {etablissement.coordonnees ? <Text style={styles.petit}>{etablissement.coordonnees}</Text> : null}
            {etablissement.mentions ? <Text style={styles.petit}>{etablissement.mentions}</Text> : null}
          </View>
          <View>
            <Text style={styles.surtitre}>REÇU DE PAIEMENT</Text>
            <Text style={styles.numero}>N° {recu.numero}</Text>
            <Text style={[styles.petit, styles.droite]}>{heure}</Text>
          </View>
        </View>

        {recu.annulation && (
          <Text style={styles.bandeauAnnule}>
            Paiement annulé le {formatDate(recu.annulation.date)} - {recu.annulation.motif}
          </Text>
        )}

        <View style={styles.blocs}>
          <View style={styles.bloc}>
            <Text style={styles.label}>REÇU DE</Text>
            <Text style={styles.valeur}>
              {recu.apprenant.prenom} {recu.apprenant.nom}
            </Text>
            <Text style={styles.petit}>
              {[recu.apprenant.matricule, recu.apprenant.telephone].filter(Boolean).join(" - ")}
            </Text>
          </View>
          {recu.formation && (
            <View style={styles.bloc}>
              <Text style={styles.label}>FORMATION</Text>
              <Text style={styles.valeur}>{recu.formation.intitule}</Text>
              <Text style={styles.petit}>{recu.formation.session}</Text>
            </View>
          )}
        </View>

        <View style={styles.tableau}>
          <View style={styles.ligneTitre}>
            <Text style={[styles.colDesignation, styles.entetes]}>Désignation</Text>
            <Text style={[styles.colDate, styles.entetes]}>Échéance</Text>
            <Text style={[styles.colMontant, styles.entetes]}>Montant (FCFA)</Text>
          </View>
          {recu.lignes.map((l, i) => (
            <View key={i} style={styles.ligne}>
              <Text style={styles.colDesignation}>
                {l.libelle}
                {l.partiel ? " (partiel)" : ""}
              </Text>
              <Text style={styles.colDate}>{formatDate(l.dateLimite)}</Text>
              <Text style={styles.colMontant}>{nombrePdf(l.montant)}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={styles.gras}>Total payé</Text>
            <Text style={styles.totalMontant}>{nombrePdf(recu.montant)} FCFA</Text>
          </View>
        </View>

        <Text style={styles.lettres}>
          Arrêté le présent reçu à la somme de{" "}
          <Text style={styles.gras}>
            {nombreEnLettres(recu.montant)} ({nombrePdf(recu.montant)}) francs CFA
          </Text>
          .
        </Text>

        <View style={styles.encadre}>
          <View style={styles.bloc}>
            <Text style={styles.label}>RÈGLEMENT</Text>
            <Text style={{ marginTop: 3 }}>
              {LABEL_MODE[recu.mode]}
              {recu.reference ? ` - réf. ${recu.reference}` : ""}
            </Text>
            <Text style={styles.petit}>Encaissé par {recu.caissier ?? "paiement en ligne"}</Text>
          </View>
          <View style={styles.bloc}>
            <Text style={styles.label}>SITUATION À CE JOUR</Text>
            <View style={[styles.ligneSituation, { marginTop: 3 }]}>
              <Text>Total formation</Text>
              <Text>{nombrePdf(s.total)}</Text>
            </View>
            <View style={styles.ligneSituation}>
              <Text>Payé à ce jour</Text>
              <Text>{nombrePdf(s.paye)}</Text>
            </View>
            <View style={styles.ligneSituation}>
              <Text style={styles.gras}>Reste à payer</Text>
              <Text style={styles.gras}>{nombrePdf(s.reste)}</Text>
            </View>
            {s.prochaine && <Text style={styles.petit}>Prochaine échéance : {formatDate(s.prochaine.date)}</Text>}
          </View>
        </View>

        {etablissement.piedRecu ? (
          <Text style={{ marginTop: 12, textAlign: "center", fontFamily: "Helvetica-Oblique" }}>
            {etablissement.piedRecu}
          </Text>
        ) : null}

        <View style={styles.pied}>
          <View>
            <Text style={styles.label}>CACHET ET SIGNATURE</Text>
            <View style={styles.cachet} />
          </View>
          <View>
            <Text style={[styles.petit, styles.droite]}>Document généré électroniquement.</Text>
            <Text style={[styles.petit, styles.droite]}>Généré avec Kalaas</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
