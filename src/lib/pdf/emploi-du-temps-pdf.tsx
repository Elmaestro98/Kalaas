import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  creneauxDuJour,
  dureeTotaleHebdo,
  formatHeure,
  joursAffiches,
  type CreneauAffiche,
} from "@/lib/emploi-du-temps";

// Couleurs du design system Kalaas (le PDF n'a pas accès aux variables CSS)
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 9, color: NAVY },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 10,
    marginBottom: 14,
  },
  etablissement: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  coordonnees: { fontSize: 8, color: GRIS, marginTop: 2 },
  surtitre: { fontSize: 8, color: GOLD_700, fontFamily: "Helvetica-Bold", letterSpacing: 1, textAlign: "right" },
  titre: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  sousTitre: { fontSize: 8, color: GRIS, textAlign: "right", marginTop: 2 },
  grille: { flexDirection: "row", gap: 6 },
  colonne: { flex: 1, borderWidth: 1, borderColor: BORDURE, borderRadius: 4 },
  jour: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  contenu: { padding: 4, gap: 4 },
  bloc: { backgroundColor: IVOIRE, borderLeftWidth: 3, borderLeftColor: GOLD, padding: 5, borderRadius: 2 },
  horaire: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD_700 },
  matiere: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 2 },
  detail: { fontSize: 7.5, color: GRIS, marginTop: 1 },
  vide: { fontSize: 8, color: GRIS, textAlign: "center", paddingVertical: 8 },
  pied: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: GRIS,
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 6,
  },
});

export type EmploiDuTempsPdfProps = {
  etablissement: string;
  coordonnees: string;
  surtitre: string;
  titre: string;
  sousTitre: string;
  creneaux: CreneauAffiche[];
  genereLe: string;
};

export default function EmploiDuTempsPdf(p: EmploiDuTempsPdfProps) {
  const jours = joursAffiches(p.creneaux);

  return (
    <Document title={`Emploi du temps - ${p.titre}`} author={p.etablissement} creator="Kalaas">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.entete}>
          <View>
            <Text style={styles.etablissement}>{p.etablissement}</Text>
            {p.coordonnees ? <Text style={styles.coordonnees}>{p.coordonnees}</Text> : null}
          </View>
          <View>
            <Text style={styles.surtitre}>{p.surtitre.toUpperCase()}</Text>
            <Text style={styles.titre}>{p.titre}</Text>
            <Text style={styles.sousTitre}>{p.sousTitre}</Text>
          </View>
        </View>

        <View style={styles.grille}>
          {jours.map((j) => {
            const cours = creneauxDuJour(p.creneaux, j.valeur);
            return (
              <View key={j.valeur} style={styles.colonne} wrap={false}>
                <Text style={styles.jour}>{j.label}</Text>
                <View style={styles.contenu}>
                  {cours.length === 0 ? (
                    <Text style={styles.vide}>-</Text>
                  ) : (
                    cours.map((c) => (
                      <View key={c.id} style={styles.bloc}>
                        <Text style={styles.horaire}>
                          {formatHeure(c.heureDebut)} - {formatHeure(c.heureFin)}
                        </Text>
                        <Text style={styles.matiere}>{c.matiere}</Text>
                        {c.details.map((d) => (
                          <Text key={d} style={styles.detail}>
                            {d}
                          </Text>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.pied} fixed>
          <Text>
            {p.creneaux.length} cours - {dureeTotaleHebdo(p.creneaux)} par semaine
          </Text>
          <Text>Édité le {p.genereLe} - Généré avec Kalaas</Text>
        </View>
      </Page>
    </Document>
  );
}
