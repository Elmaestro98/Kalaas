import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import { LIBELLE_DECISION, formatNote, mention, moyennePonderee } from "@/lib/notes";
import { cleSemestre, type BlocSemestre, type EnTeteReleve, type Releve } from "@/lib/notes-donnees";

// Couleurs du design system Kalaas (identiques au reçu)
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";
const ROUGE = "#B42318";
const VERT = "#1F7A4D";

const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingHorizontal: 36, paddingBottom: 48, fontFamily: "Helvetica", fontSize: 9, color: NAVY },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 10,
  },
  etablissement: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  petit: { fontSize: 7.5, color: GRIS, marginTop: 2 },
  surtitre: { fontSize: 8, color: GOLD_700, fontFamily: "Helvetica-Bold", letterSpacing: 1, textAlign: "right" },
  titre: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  droite: { textAlign: "right" },
  identite: { flexDirection: "row", gap: 12, marginTop: 14, backgroundColor: IVOIRE, padding: 10, borderRadius: 3 },
  bloc: { flex: 1 },
  label: { fontSize: 7, color: GRIS, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  valeur: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  valeurNormale: { fontSize: 9, marginTop: 2 },
  semestre: { marginTop: 16 },
  titreSemestre: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  ligneTitre: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", paddingVertical: 4, paddingHorizontal: 4 },
  entetes: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  ligneUE: { flexDirection: "row", backgroundColor: IVOIRE, paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDURE },
  ligne: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDURE },
  colIntitule: { flex: 4 },
  colMatiere: { flex: 4, paddingLeft: 10 },
  colCredits: { flex: 1, textAlign: "center" },
  colCoef: { flex: 1, textAlign: "center" },
  colMoyenne: { flex: 1.2, textAlign: "center" },
  colResultat: { flex: 1.6, textAlign: "center" },
  gras: { fontFamily: "Helvetica-Bold" },
  rouge: { color: ROUGE },
  synthese: { flexDirection: "row", gap: 8, marginTop: 6 },
  case: { flex: 1, borderWidth: 1, borderColor: BORDURE, borderRadius: 3, padding: 6 },
  chiffre: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  annuel: { marginTop: 16, borderWidth: 1.5, borderColor: GOLD, borderRadius: 3, padding: 8 },
  bandeau: { marginTop: 10, padding: 6, backgroundColor: "#FDF3E1", color: GOLD_700, fontSize: 8 },
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
  signatures: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  cachet: { width: 170, height: 60, borderWidth: 1, borderColor: BORDURE, borderStyle: "dashed", marginTop: 4 },
  piedPage: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRIS,
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 4,
  },
});

export type ReleveNotesPdfProps = {
  etablissement: { nom: string; coordonnees: string; mentions: string; ville: string | null };
  enTete: EnTeteReleve;
  blocs: BlocSemestre[];
  lmd: boolean;
  definitif: boolean; // toutes les évaluations verrouillées
  releves: Releve[];
  dateEdition: Date;
};

function Note({ valeur, gras }: { valeur: number | null; gras?: boolean }) {
  const style = [styles.colMoyenne, ...(gras ? [styles.gras] : []), ...(valeur !== null && valeur < 10 ? [styles.rouge] : [])];
  return <Text style={style}>{formatNote(valeur)}</Text>;
}

function couleurDecision(decision: keyof typeof LIBELLE_DECISION | null) {
  if (decision === "NON_VALIDEE") return ROUGE;
  if (decision === "VALIDEE") return VERT;
  return GOLD_700;
}

// Référence lisible et stable du document (permet de retrouver le relevé en cas de doute)
function reference(releve: Releve, annee: string | null) {
  const base = releve.apprenant.matricule ?? releve.inscriptionId.slice(-8).toUpperCase();
  return `RN-${annee ? annee.replace("-", "") + "-" : ""}${base}`;
}

export default function ReleveNotesPdf({ etablissement, enTete, blocs, lmd, definitif, releves, dateEdition }: ReleveNotesPdfProps) {
  return (
    <Document
      title={releves.length === 1 ? `Relevé de notes - ${releves[0].apprenant.nom}` : `Relevés de notes - ${enTete.classe}`}
      author={etablissement.nom}
      creator="Kalaas"
    >
      {releves.map((r) => {
        const semestres = blocs.map((b) => ({ bloc: b, cle: cleSemestre(b.semestre), res: r.ligne.semestres[cleSemestre(b.semestre)] }));
        const provisoire = !definitif || semestres.some((s) => !s.res?.complete);
        const moyenneAnnuelle = moyennePonderee(
          semestres.map((s) => ({ valeur: s.res?.moyenne ?? null, poids: s.res?.creditsTotal ?? 0 })),
        );
        const creditsAcquis = semestres.reduce((t, s) => t + (s.res?.creditsAcquis ?? 0), 0);
        const creditsTotal = semestres.reduce((t, s) => t + (s.res?.creditsTotal ?? 0), 0);
        const ref = reference(r, enTete.anneeAcademique);

        return (
          <Page key={r.inscriptionId} size="A4" style={styles.page}>
            {provisoire && <Text style={styles.filigrane} fixed>PROVISOIRE</Text>}

            <View style={styles.entete}>
              <View style={{ maxWidth: 280 }}>
                <Text style={styles.etablissement}>{etablissement.nom}</Text>
                {etablissement.coordonnees ? <Text style={styles.petit}>{etablissement.coordonnees}</Text> : null}
                {etablissement.mentions ? <Text style={styles.petit}>{etablissement.mentions}</Text> : null}
              </View>
              <View>
                <Text style={styles.surtitre}>
                  {enTete.anneeAcademique ? `ANNÉE ACADÉMIQUE ${enTete.anneeAcademique}` : "FORMATION"}
                </Text>
                <Text style={styles.titre}>RELEVÉ DE NOTES</Text>
                <Text style={[styles.petit, styles.droite]}>Réf. {ref}</Text>
              </View>
            </View>

            <View style={styles.identite}>
              <View style={styles.bloc}>
                <Text style={styles.label}>ÉTUDIANT</Text>
                <Text style={styles.valeur}>{r.apprenant.nom}</Text>
                {r.apprenant.matricule ? <Text style={styles.valeurNormale}>Matricule : {r.apprenant.matricule}</Text> : null}
                {r.apprenant.dateNaissance ? (
                  <Text style={styles.valeurNormale}>
                    Né(e) le {formatDate(r.apprenant.dateNaissance)}
                    {r.apprenant.lieuNaissance ? ` à ${r.apprenant.lieuNaissance}` : ""}
                  </Text>
                ) : null}
              </View>
              <View style={styles.bloc}>
                <Text style={styles.label}>FORMATION</Text>
                <Text style={styles.valeur}>{enTete.formation}</Text>
                <Text style={styles.valeurNormale}>
                  {enTete.niveau ? `Niveau ${enTete.niveau} · ` : ""}Classe : {enTete.classe}
                </Text>
                <Text style={styles.valeurNormale}>Effectif : {r.effectif}</Text>
              </View>
            </View>

            {provisoire && (
              <Text style={styles.bandeau}>
                Relevé provisoire : des notes manquent ou n&apos;ont pas encore été validées (verrouillées) par la direction.
              </Text>
            )}

            {semestres.map(({ bloc, cle, res }) => (
              <View key={cle} style={styles.semestre} wrap={false}>
                <Text style={styles.titreSemestre}>
                  {!lmd ? "Résultats" : bloc.semestre ? `Semestre ${bloc.semestre}` : "Semestre non précisé"}
                </Text>

                <View style={styles.ligneTitre}>
                  <Text style={[styles.colIntitule, styles.entetes]}>{lmd ? "Unité d'enseignement / Matière" : "Matière"}</Text>
                  {lmd && <Text style={[styles.colCredits, styles.entetes]}>Crédits</Text>}
                  <Text style={[styles.colCoef, styles.entetes]}>Coef.</Text>
                  <Text style={[styles.colMoyenne, styles.entetes]}>Moy. /20</Text>
                  {lmd && <Text style={[styles.colResultat, styles.entetes]}>Résultat</Text>}
                </View>

                {bloc.ues.map((ue) => {
                  const resUE = res?.ues.find((u) => u.id === ue.id);
                  return (
                    <View key={ue.id}>
                      {lmd && (
                        <View style={styles.ligneUE}>
                          <Text style={[styles.colIntitule, styles.gras]}>{ue.intitule}</Text>
                          <Text style={[styles.colCredits, styles.gras]}>{ue.credits ?? 0}</Text>
                          <Text style={styles.colCoef} />
                          <Note valeur={resUE?.moyenne ?? null} gras />
                          <Text style={[styles.colResultat, styles.gras, { color: couleurDecision(resUE?.decision ?? null) }]}>
                            {resUE?.decision ? LIBELLE_DECISION[resUE.decision].label : "—"}
                          </Text>
                        </View>
                      )}
                      {ue.matieres.map((m) => (
                        <View key={m.id} style={styles.ligne}>
                          <Text style={lmd ? styles.colMatiere : styles.colIntitule}>{m.intitule}</Text>
                          {lmd && <Text style={styles.colCredits} />}
                          <Text style={styles.colCoef}>{m.coefficient ?? 1}</Text>
                          <Note valeur={r.ligne.moyennes[m.id]?.moyenne ?? null} />
                          {lmd && <Text style={styles.colResultat} />}
                        </View>
                      ))}
                    </View>
                  );
                })}

                <View style={styles.synthese}>
                  <View style={styles.case}>
                    <Text style={styles.label}>MOYENNE</Text>
                    <Text style={[styles.chiffre, ...(res?.moyenne !== null && (res?.moyenne ?? 0) < 10 ? [styles.rouge] : [])]}>
                      {formatNote(res?.moyenne ?? null)} / 20
                    </Text>
                  </View>
                  {lmd && (
                    <View style={styles.case}>
                      <Text style={styles.label}>CRÉDITS ACQUIS</Text>
                      <Text style={styles.chiffre}>
                        {res?.creditsAcquis ?? 0} / {res?.creditsTotal ?? 0}
                      </Text>
                    </View>
                  )}
                  <View style={styles.case}>
                    <Text style={styles.label}>RÉSULTAT</Text>
                    <Text style={[styles.chiffre, { color: res?.valide ? VERT : res?.valide === false ? ROUGE : NAVY }]}>
                      {res?.valide === null || !res ? "—" : res.valide ? (lmd ? "Semestre validé" : "Admis") : lmd ? "Non validé" : "Ajourné"}
                    </Text>
                  </View>
                  <View style={styles.case}>
                    <Text style={styles.label}>MENTION · RANG</Text>
                    <Text style={styles.chiffre}>
                      {mention(res?.moyenne ?? null) ?? "—"} · {r.rangs[cle] ? `${r.rangs[cle]}${r.rangs[cle] === 1 ? "er" : "e"}/${r.effectif}` : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {lmd && semestres.length > 1 && (
              <View style={styles.annuel} wrap={false}>
                <Text style={styles.label}>BILAN DE L&apos;ANNÉE</Text>
                <Text style={[styles.chiffre, { fontSize: 11 }]}>
                  Moyenne annuelle : {formatNote(moyenneAnnuelle)} / 20 · Crédits acquis : {creditsAcquis} / {creditsTotal}
                  {mention(moyenneAnnuelle) ? ` · Mention ${mention(moyenneAnnuelle)}` : ""}
                </Text>
              </View>
            )}

            <View style={styles.signatures} wrap={false}>
              <View>
                <Text style={styles.petit}>Règles : moyenne de matière pondérée par les évaluations,</Text>
                <Text style={styles.petit}>
                  {lmd
                    ? "moyenne d'UE par les coefficients, moyenne de semestre par les crédits."
                    : "moyenne générale pondérée par les coefficients."}
                </Text>
                {lmd && <Text style={styles.petit}>UE validée à 10/20 ou par compensation (semestre à 10/20).</Text>}
              </View>
              <View>
                <Text>
                  Fait à {etablissement.ville ?? "................"}, le {formatDate(dateEdition)}
                </Text>
                <Text style={[styles.gras, { marginTop: 4 }]}>Le Directeur des études</Text>
                <View style={styles.cachet} />
              </View>
            </View>

            <View style={styles.piedPage} fixed>
              <Text>
                {etablissement.nom} · Réf. {ref}
              </Text>
              <Text>Document généré par Kalaas · Toute rature ou surcharge annule ce relevé</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
