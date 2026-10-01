import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { TYPES_DOCUMENT, accord, civilite, type ContenuDocument, type TypeDocumentSaisie } from "@/lib/documents";

// Couleurs du design system Kalaas (identiques au reçu et au relevé)
const NAVY = "#0D1B2A";
const GOLD = "#C4A35A";
const GOLD_700 = "#7A5F22";
const IVOIRE = "#F7F5F0";
const BORDURE = "#E4DFD3";
const GRIS = "#5B6675";

// Dates longues : « 14 mars 2005 »
const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateLongueDakar = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Dakar",
});
const jour = (iso: string) => dateLongue.format(new Date(`${iso}T00:00:00Z`));

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 56, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 11, color: NAVY },
  entete: { borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 10 },
  etablissement: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  petit: { fontSize: 8, color: GRIS, marginTop: 2 },
  titre: { marginTop: 40, fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1.5 },
  filet: { width: 70, height: 2, backgroundColor: GOLD, alignSelf: "center", marginTop: 8 },
  numero: { marginTop: 8, fontSize: 9, color: GOLD_700, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 0.8 },
  paragraphe: { marginTop: 22, lineHeight: 1.5, textAlign: "justify" },
  identite: { marginTop: 16, backgroundColor: IVOIRE, borderLeftWidth: 3, borderLeftColor: GOLD, padding: 14 },
  nom: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  ligne: { marginTop: 4, fontSize: 10.5 },
  gras: { fontFamily: "Helvetica-Bold" },
  motif: { marginTop: 10, fontSize: 9.5, color: GRIS },
  signature: { marginTop: 40, alignSelf: "flex-end", width: 220 },
  cachet: { height: 80, borderWidth: 1, borderColor: BORDURE, borderStyle: "dashed", marginTop: 6 },
  piedPage: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: GRIS,
    borderTopWidth: 1,
    borderTopColor: BORDURE,
    paddingTop: 5,
  },
});

export type AttestationPdfProps = {
  etablissement: { nom: string; coordonnees: string; mentions: string; ville: string | null };
  type: TypeDocumentSaisie;
  numero: string;
  motif: string | null;
  contenu: ContenuDocument;
  dateDelivrance: Date;
};

export default function AttestationPdf({ etablissement, type, numero, motif, contenu: c, dateDelivrance }: AttestationPdfProps) {
  const sexe = c.apprenant.sexe;
  const designation = [civilite(sexe), c.apprenant.prenom, c.apprenant.nom.toUpperCase()].filter(Boolean).join(" ");
  const nomDocument = type === "ATTESTATION_INSCRIPTION" ? "La présente attestation" : "Le présent certificat";
  const periode = c.anneeAcademique
    ? `au titre de l'année académique ${c.anneeAcademique}`
    : `pour la session du ${jour(c.dateDebut)} au ${jour(c.dateFin)}`;
  const formation = `${c.formation}${c.niveau && !c.formation.includes(c.niveau) ? ` (niveau ${c.niveau})` : ""}`;

  return (
    <Document title={`${TYPES_DOCUMENT[type].label} ${numero}`} author={etablissement.nom} creator="Kalaas">
      <Page size="A4" style={styles.page}>
        <View style={styles.entete}>
          <Text style={styles.etablissement}>{etablissement.nom}</Text>
          {etablissement.coordonnees ? <Text style={styles.petit}>{etablissement.coordonnees}</Text> : null}
          {etablissement.mentions ? <Text style={styles.petit}>{etablissement.mentions}</Text> : null}
        </View>

        <Text style={styles.titre}>{TYPES_DOCUMENT[type].titre}</Text>
        <View style={styles.filet} />
        <Text style={styles.numero}>N° {numero}</Text>

        <Text style={styles.paragraphe}>
          Je {accord(null, "soussigné", "soussignée")}, Directeur de l&apos;établissement {etablissement.nom},{" "}
          {type === "ATTESTATION_INSCRIPTION" ? "atteste" : "certifie"} que :
        </Text>

        <View style={styles.identite}>
          <Text style={styles.nom}>{designation}</Text>
          {c.apprenant.dateNaissance ? (
            <Text style={styles.ligne}>
              {accord(sexe, "Né", "Née")} le {jour(c.apprenant.dateNaissance)}
              {c.apprenant.lieuNaissance ? ` à ${c.apprenant.lieuNaissance}` : ""}
            </Text>
          ) : null}
          {c.apprenant.matricule ? (
            <Text style={styles.ligne}>
              Matricule : <Text style={styles.gras}>{c.apprenant.matricule}</Text>
            </Text>
          ) : null}
        </View>

        {type === "ATTESTATION_INSCRIPTION" ? (
          <Text style={styles.paragraphe}>
            {c.enCours ? "est régulièrement " : "a été régulièrement "}
            {accord(sexe, "inscrit", "inscrite")} dans notre établissement {periode}, en{" "}
            <Text style={styles.gras}>{formation}</Text>, classe « {c.classe} », depuis le {jour(c.dateInscription)}.
          </Text>
        ) : (
          <Text style={styles.paragraphe}>
            est {accord(sexe, "inscrit", "inscrite")} dans notre établissement {periode} et suit régulièrement les
            enseignements de <Text style={styles.gras}>{formation}</Text>, classe « {c.classe} ».
            {c.anneeAcademique ? ` Les cours se déroulent du ${jour(c.dateDebut)} au ${jour(c.dateFin)}.` : ""}
            {c.assiduite !== null ? ` Taux d'assiduité constaté à ce jour : ${c.assiduite} %.` : ""}
          </Text>
        )}

        <Text style={styles.paragraphe}>
          {nomDocument} lui est {type === "ATTESTATION_INSCRIPTION" ? "délivrée" : "délivré"} pour servir et valoir ce
          que de droit.
        </Text>
        {motif ? <Text style={styles.motif}>Motif de la demande : {motif}</Text> : null}

        <View style={styles.signature}>
          <Text>
            Fait à {etablissement.ville ?? "................"}, le {dateLongueDakar.format(dateDelivrance)}
          </Text>
          <Text style={[styles.gras, { marginTop: 6 }]}>Le Directeur</Text>
          <Text style={styles.petit}>Signature et cachet</Text>
          <View style={styles.cachet} />
        </View>

        <View style={styles.piedPage} fixed>
          <Text>
            {etablissement.nom} · N° {numero}
          </Text>
          <Text>Document généré par Kalaas · Toute rature ou surcharge annule ce document</Text>
        </View>
      </Page>
    </Document>
  );
}
