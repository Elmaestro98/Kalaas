import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import { formatNote } from "@/lib/notes";
import { DISTINCTIONS, formatRang, libellePeriode, type DecoupageSaisie } from "@/lib/bulletins";
import type { Bulletin, EnTeteBulletin, ResultatsScolaires } from "@/lib/bulletins-donnees";

// Couleurs du design system Kalaas (identiques au reçu et au relevé de notes)
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";
const ROUGE = "#B42318";

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingHorizontal: 32, paddingBottom: 44, fontFamily: "Helvetica", fontSize: 8.5, color: NAVY },
  entete: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 8 },
  etablissement: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  petit: { fontSize: 7, color: GRIS, marginTop: 2 },
  surtitre: { fontSize: 7.5, color: GOLD_700, fontFamily: "Helvetica-Bold", letterSpacing: 1, textAlign: "right" },
  titre: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  sousTitre: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 1, color: GOLD_700 },
  identite: { flexDirection: "row", gap: 10, marginTop: 10, backgroundColor: IVOIRE, padding: 8, borderRadius: 3 },
  bloc: { flex: 1 },
  label: { fontSize: 6.5, color: GRIS, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  valeur: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 2 },
  valeurNormale: { fontSize: 8, marginTop: 1.5 },
  tableau: { marginTop: 10 },
  ligneTitre: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", paddingVertical: 4, paddingHorizontal: 3 },
  entetes: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  ligne: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: BORDURE },
  ligneTotal: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 3, backgroundColor: IVOIRE },
  colMatiere: { flex: 3.2 },
  colCoef: { flex: 0.7, textAlign: "center" },
  colNote: { flex: 1, textAlign: "center" },
  colAppreciation: { flex: 3.6, paddingLeft: 4 },
  professeur: { fontSize: 6.5, color: GRIS, marginTop: 1 },
  gras: { fontFamily: "Helvetica-Bold" },
  rouge: { color: ROUGE },
  synthese: { flexDirection: "row", gap: 6, marginTop: 8 },
  case: { flex: 1, borderWidth: 1, borderColor: BORDURE, borderRadius: 3, padding: 5 },
  chiffre: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  rappel: { marginTop: 8, borderWidth: 1.5, borderColor: GOLD, borderRadius: 3, padding: 6 },
  conseil: { marginTop: 8, borderWidth: 1, borderColor: BORDURE, borderRadius: 3, padding: 6 },
  distinctions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  distinction: { flexDirection: "row", alignItems: "center", gap: 3 },
  caseACocher: { width: 7, height: 7, borderWidth: 1, borderColor: NAVY },
  caseCochee: { width: 7, height: 7, borderWidth: 1, borderColor: NAVY, backgroundColor: NAVY },
  bandeau: { marginTop: 8, padding: 5, backgroundColor: "#FDF3E1", color: GOLD_700, fontSize: 7.5 },
  filigrane: {
    position: "absolute",
    top: 360,
    left: 70,
    fontSize: 80,
    fontFamily: "Helvetica-Bold",
    color: ROUGE,
    opacity: 0.1,
    transform: "rotate(-30deg)",
  },
  signatures: { marginTop: 12, flexDirection: "row", gap: 10 },
  signature: { flex: 1 },
  cadre: { height: 48, borderWidth: 1, borderColor: BORDURE, borderStyle: "dashed", marginTop: 3 },
  piedPage: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: GRIS,
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 4,
  },
});

export type BulletinScolairePdfProps = {
  etablissement: { nom: string; coordonnees: string; mentions: string; ville: string | null };
  enTete: EnTeteBulletin;
  resultats: ResultatsScolaires;
  decoupage: DecoupageSaisie;
  periode: number;
  bulletins: Bulletin[];
  dateEdition: Date;
};

type Style = (typeof styles)[keyof typeof styles];

function Note({ valeur, style }: { valeur: number | null; style: Style[] }) {
  return <Text style={[...style, ...(valeur !== null && valeur < 10 ? [styles.rouge] : [])]}>{formatNote(valeur)}</Text>;
}

// Référence lisible et stable du document (permet de retrouver le bulletin en cas de doute)
function reference(b: Bulletin, annee: string | null, periode: number) {
  const base = b.eleve.matricule ?? b.inscriptionId.slice(-8).toUpperCase();
  return `BUL-${annee ? annee.replace("-", "") + "-" : ""}P${periode}-${base}`;
}

export default function BulletinScolairePdf({
  etablissement,
  enTete,
  resultats,
  decoupage,
  periode,
  bulletins,
  dateEdition,
}: BulletinScolairePdfProps) {
  const nomPeriode = libellePeriode(decoupage, periode);
  const stats = resultats.stats[periode];
  const derniere = periode === resultats.periodes.length;
  const precedentes = resultats.periodes.filter((p) => p < periode);

  return (
    <Document
      title={bulletins.length === 1 ? `Bulletin - ${bulletins[0].eleve.nom}` : `Bulletins - ${enTete.classe}`}
      author={etablissement.nom}
      creator="Kalaas"
    >
      {bulletins.map((b) => {
        const res = b.ligne.periodes[periode];
        const provisoire = !resultats.verrouille[periode] || !res.complete;
        const ref = reference(b, enTete.annee, periode);
        // Seules les matières évaluées sur la période comptent dans les totaux
        const evaluees = resultats.matieres.filter((m) => res.moyennes[m.id].moyenne !== null);
        const totalCoef = evaluees.reduce((s, m) => s + m.coefficient, 0);
        const totalPoints = evaluees.reduce((s, m) => s + (res.moyennes[m.id].moyenne ?? 0) * m.coefficient, 0);
        const ne = b.eleve.sexe === "F" ? "Née" : b.eleve.sexe === "M" ? "Né" : "Né(e)";

        return (
          <Page key={b.inscriptionId} size="A4" style={styles.page}>
            {provisoire && <Text style={styles.filigrane} fixed>PROVISOIRE</Text>}

            <View style={styles.entete}>
              <View style={{ maxWidth: 270 }}>
                <Text style={styles.etablissement}>{etablissement.nom}</Text>
                {etablissement.coordonnees ? <Text style={styles.petit}>{etablissement.coordonnees}</Text> : null}
                {etablissement.mentions ? <Text style={styles.petit}>{etablissement.mentions}</Text> : null}
              </View>
              <View>
                <Text style={styles.surtitre}>{enTete.annee ? `ANNÉE SCOLAIRE ${enTete.annee}` : "ANNÉE SCOLAIRE"}</Text>
                <Text style={styles.titre}>BULLETIN DE NOTES</Text>
                <Text style={styles.sousTitre}>{nomPeriode}</Text>
              </View>
            </View>

            <View style={styles.identite}>
              <View style={styles.bloc}>
                <Text style={styles.label}>ÉLÈVE</Text>
                <Text style={styles.valeur}>{b.eleve.nom}</Text>
                {b.eleve.matricule ? <Text style={styles.valeurNormale}>Matricule : {b.eleve.matricule}</Text> : null}
                {b.eleve.dateNaissance ? (
                  <Text style={styles.valeurNormale}>
                    {ne} le {formatDate(b.eleve.dateNaissance)}
                    {b.eleve.lieuNaissance ? ` à ${b.eleve.lieuNaissance}` : ""}
                  </Text>
                ) : null}
              </View>
              <View style={styles.bloc}>
                <Text style={styles.label}>CLASSE</Text>
                <Text style={styles.valeur}>{enTete.classe}</Text>
                <Text style={styles.valeurNormale}>
                  {enTete.cycle}
                  {enTete.niveau ? ` · ${enTete.niveau}` : ""} · Effectif : {b.effectif}
                </Text>
                {enTete.professeurPrincipal ? (
                  <Text style={styles.valeurNormale}>Professeur principal : {enTete.professeurPrincipal}</Text>
                ) : null}
              </View>
            </View>

            {provisoire && (
              <Text style={styles.bandeau}>
                Bulletin provisoire : des notes manquent ou n&apos;ont pas encore été validées (verrouillées) par la direction.
              </Text>
            )}

            <View style={styles.tableau}>
              <View style={styles.ligneTitre}>
                <Text style={[styles.colMatiere, styles.entetes]}>Matière</Text>
                <Text style={[styles.colCoef, styles.entetes]}>Coef.</Text>
                <Text style={[styles.colNote, styles.entetes]}>Moy. /20</Text>
                <Text style={[styles.colNote, styles.entetes]}>Points</Text>
                <Text style={[styles.colNote, styles.entetes]}>Moy. classe</Text>
                <Text style={[styles.colAppreciation, styles.entetes]}>Appréciation du professeur</Text>
              </View>
              {resultats.matieres.map((m) => {
                const moyenne = res.moyennes[m.id].moyenne;
                return (
                  <View key={m.id} style={styles.ligne} wrap={false}>
                    <View style={styles.colMatiere}>
                      <Text style={styles.gras}>{m.intitule}</Text>
                      {m.professeur ? <Text style={styles.professeur}>{m.professeur}</Text> : null}
                    </View>
                    <Text style={styles.colCoef}>{m.coefficient}</Text>
                    <Note valeur={moyenne} style={[styles.colNote, styles.gras]} />
                    <Text style={styles.colNote}>{moyenne === null ? "—" : formatNote(moyenne * m.coefficient)}</Text>
                    <Text style={[styles.colNote, { color: GRIS }]}>{formatNote(stats.moyennesMatieres[m.id] ?? null)}</Text>
                    <Text style={styles.colAppreciation}>{b.appreciations[m.id] ?? ""}</Text>
                  </View>
                );
              })}
              <View style={styles.ligneTotal}>
                <Text style={[styles.colMatiere, styles.gras]}>Totaux</Text>
                <Text style={[styles.colCoef, styles.gras]}>{totalCoef}</Text>
                <Text style={styles.colNote} />
                <Text style={[styles.colNote, styles.gras]}>{formatNote(totalCoef > 0 ? totalPoints : null)}</Text>
                <Text style={styles.colNote} />
                <Text style={styles.colAppreciation} />
              </View>
            </View>

            <View style={styles.synthese} wrap={false}>
              <View style={styles.case}>
                <Text style={styles.label}>MOYENNE DU {nomPeriode.split(" ")[1].toUpperCase()}</Text>
                <Text style={[styles.chiffre, ...(res.moyenne !== null && res.moyenne < 10 ? [styles.rouge] : [])]}>
                  {formatNote(res.moyenne)} / 20
                </Text>
              </View>
              <View style={styles.case}>
                <Text style={styles.label}>RANG</Text>
                <Text style={styles.chiffre}>
                  {res.rang ? `${formatRang(res.rang, res.exAequo)} / ${b.effectif}` : "—"}
                </Text>
              </View>
              <View style={styles.case}>
                <Text style={styles.label}>CLASSE (MOY. · + FORTE · + FAIBLE)</Text>
                <Text style={[styles.chiffre, { fontSize: 9.5 }]}>
                  {formatNote(stats.moyenneClasse)} · {formatNote(stats.plusForte)} · {formatNote(stats.plusFaible)}
                </Text>
              </View>
              <View style={styles.case}>
                <Text style={styles.label}>ABSENCES (DEPUIS LA RENTRÉE)</Text>
                <Text style={styles.chiffre}>{b.absences}</Text>
              </View>
            </View>

            {(precedentes.length > 0 || derniere) && resultats.periodes.length > 1 && (
              <View style={styles.rappel} wrap={false}>
                <Text style={styles.label}>{derniere ? "BILAN DE L'ANNÉE" : "RAPPEL DES PÉRIODES PRÉCÉDENTES"}</Text>
                <Text style={[styles.valeurNormale, { marginTop: 3 }]}>
                  {(derniere ? resultats.periodes : precedentes)
                    .map((p) => {
                      const r = b.ligne.periodes[p];
                      return `${libellePeriode(decoupage, p)} : ${formatNote(r.moyenne)}${r.rang ? ` (${formatRang(r.rang, r.exAequo)})` : ""}`;
                    })
                    .join("   ·   ")}
                </Text>
                {derniere && (
                  <Text style={[styles.chiffre, { fontSize: 10 }]}>
                    Moyenne annuelle : {formatNote(b.ligne.annuelle.moyenne)} / 20
                    {b.ligne.annuelle.rang
                      ? ` · Rang : ${formatRang(b.ligne.annuelle.rang, b.ligne.annuelle.exAequo)} / ${b.effectif}`
                      : ""}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.conseil} wrap={false}>
              <Text style={styles.label}>AVIS DU CONSEIL DE CLASSE</Text>
              <View style={styles.distinctions}>
                {DISTINCTIONS.map((d) => (
                  <View key={d.valeur} style={styles.distinction}>
                    <View style={b.conseil.distinction === d.valeur ? styles.caseCochee : styles.caseACocher} />
                    <Text style={b.conseil.distinction === d.valeur ? styles.gras : {}}>{d.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.valeurNormale, { marginTop: 5, minHeight: 14 }]}>
                {b.conseil.appreciation ?? ""}
              </Text>
            </View>

            <View style={styles.signatures} wrap={false}>
              <View style={styles.signature}>
                <Text style={styles.gras}>Le Professeur principal</Text>
                <View style={styles.cadre} />
              </View>
              <View style={styles.signature}>
                <Text style={styles.gras}>
                  Le Directeur · {etablissement.ville ?? "........"}, le {formatDate(dateEdition)}
                </Text>
                <View style={styles.cadre} />
              </View>
              <View style={styles.signature}>
                <Text style={styles.gras}>Signature du parent</Text>
                <View style={styles.cadre} />
              </View>
            </View>

            <View style={styles.piedPage} fixed>
              <Text>
                {etablissement.nom} · Réf. {ref}
              </Text>
              <Text>Document généré par Kalaas · Toute rature ou surcharge annule ce bulletin</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
