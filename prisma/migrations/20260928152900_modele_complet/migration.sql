-- CreateEnum
CREATE TYPE "StatutInscription" AS ENUM ('ACTIVE', 'ABANDON', 'TERMINEE', 'TRANSFEREE');

-- CreateEnum
CREATE TYPE "TypeRemise" AS ENUM ('MONTANT', 'POURCENTAGE');

-- CreateEnum
CREATE TYPE "TypeEcheance" AS ENUM ('INSCRIPTION', 'MENSUALITE');

-- CreateEnum
CREATE TYPE "StatutEcheance" AS ENUM ('A_PAYER', 'PARTIEL', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'VIREMENT');

-- CreateEnum
CREATE TYPE "StatutPresence" AS ENUM ('PRESENT', 'ABSENT', 'RETARD', 'EXCUSE');

-- CreateEnum
CREATE TYPE "CanalRelance" AS ENUM ('WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "DeclencheurRelance" AS ENUM ('MANUELLE', 'J_MOINS_3', 'J_PLUS_1', 'J_PLUS_7');

-- CreateEnum
CREATE TYPE "StatutRelance" AS ENUM ('A_ENVOYER', 'ENVOYEE', 'ECHEC');

-- CreateEnum
CREATE TYPE "StatutJob" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ECHEC');

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "fraisInscription" INTEGER NOT NULL,
    "prixTotal" INTEGER NOT NULL,
    "nbMensualites" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "formateurId" TEXT,
    "nom" TEXT NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "horaires" TEXT,
    "capacite" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "pieceIdentite" TEXT,
    "tuteurNom" TEXT,
    "tuteurTelephone" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remiseType" "TypeRemise",
    "remiseValeur" INTEGER NOT NULL DEFAULT 0,
    "motifRemise" TEXT,
    "statut" "StatutInscription" NOT NULL DEFAULT 'ACTIVE',
    "dateSortie" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "type" "TypeEcheance" NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "montantDu" INTEGER NOT NULL,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "dateLimite" DATE NOT NULL,
    "statut" "StatutEcheance" NOT NULL DEFAULT 'A_PAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Echeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "caissierId" TEXT,
    "numeroRecu" TEXT NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "montant" INTEGER NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaiementEcheance" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "echeanceId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,

    CONSTRAINT "PaiementEcheance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annulation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurRecu" (
    "institutId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurRecu_pkey" PRIMARY KEY ("institutId","annee")
);

-- CreateTable
CREATE TABLE "ClotureCaisse" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "caissierId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "montantTheorique" INTEGER NOT NULL,
    "montantCompte" INTEGER NOT NULL,
    "ecart" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClotureCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seance" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "statut" "StatutPresence" NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleRelance" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "declencheur" "DeclencheurRelance" NOT NULL,
    "canal" "CanalRelance" NOT NULL,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relance" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "echeanceId" TEXT NOT NULL,
    "auteurId" TEXT,
    "canal" "CanalRelance" NOT NULL,
    "declencheur" "DeclencheurRelance" NOT NULL,
    "message" TEXT NOT NULL,
    "statut" "StatutRelance" NOT NULL DEFAULT 'A_ENVOYER',
    "envoyeeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "institutId" TEXT,
    "auteurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "avant" JSONB,
    "apres" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "institutId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statut" "StatutJob" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "executerApres" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Formation_institutId_idx" ON "Formation"("institutId");

-- CreateIndex
CREATE INDEX "Session_institutId_idx" ON "Session"("institutId");

-- CreateIndex
CREATE INDEX "Session_formationId_idx" ON "Session"("formationId");

-- CreateIndex
CREATE INDEX "Session_formateurId_idx" ON "Session"("formateurId");

-- CreateIndex
CREATE INDEX "Apprenant_institutId_nom_idx" ON "Apprenant"("institutId", "nom");

-- CreateIndex
CREATE INDEX "Apprenant_institutId_telephone_idx" ON "Apprenant"("institutId", "telephone");

-- CreateIndex
CREATE INDEX "Inscription_institutId_idx" ON "Inscription"("institutId");

-- CreateIndex
CREATE INDEX "Inscription_apprenantId_idx" ON "Inscription"("apprenantId");

-- CreateIndex
CREATE INDEX "Inscription_sessionId_idx" ON "Inscription"("sessionId");

-- CreateIndex
CREATE INDEX "Echeance_institutId_statut_dateLimite_idx" ON "Echeance"("institutId", "statut", "dateLimite");

-- CreateIndex
CREATE INDEX "Echeance_inscriptionId_idx" ON "Echeance"("inscriptionId");

-- CreateIndex
CREATE INDEX "Paiement_institutId_date_idx" ON "Paiement"("institutId", "date");

-- CreateIndex
CREATE INDEX "Paiement_apprenantId_idx" ON "Paiement"("apprenantId");

-- CreateIndex
CREATE INDEX "Paiement_caissierId_date_idx" ON "Paiement"("caissierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_institutId_numeroRecu_key" ON "Paiement"("institutId", "numeroRecu");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_mode_reference_key" ON "Paiement"("mode", "reference");

-- CreateIndex
CREATE INDEX "PaiementEcheance_echeanceId_idx" ON "PaiementEcheance"("echeanceId");

-- CreateIndex
CREATE INDEX "PaiementEcheance_institutId_idx" ON "PaiementEcheance"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementEcheance_paiementId_echeanceId_key" ON "PaiementEcheance"("paiementId", "echeanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Annulation_paiementId_key" ON "Annulation"("paiementId");

-- CreateIndex
CREATE INDEX "Annulation_institutId_date_idx" ON "Annulation"("institutId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClotureCaisse_institutId_caissierId_date_key" ON "ClotureCaisse"("institutId", "caissierId", "date");

-- CreateIndex
CREATE INDEX "Seance_institutId_idx" ON "Seance"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "Seance_sessionId_date_key" ON "Seance"("sessionId", "date");

-- CreateIndex
CREATE INDEX "Presence_inscriptionId_idx" ON "Presence"("inscriptionId");

-- CreateIndex
CREATE INDEX "Presence_institutId_idx" ON "Presence"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_seanceId_inscriptionId_key" ON "Presence"("seanceId", "inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ModeleRelance_institutId_declencheur_canal_key" ON "ModeleRelance"("institutId", "declencheur", "canal");

-- CreateIndex
CREATE INDEX "Relance_institutId_createdAt_idx" ON "Relance"("institutId", "createdAt");

-- CreateIndex
CREATE INDEX "Relance_echeanceId_idx" ON "Relance"("echeanceId");

-- CreateIndex
CREATE INDEX "JournalAudit_institutId_createdAt_idx" ON "JournalAudit"("institutId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalAudit_entite_entiteId_idx" ON "JournalAudit"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "Job_statut_executerApres_idx" ON "Job"("statut", "executerApres");

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementEcheance" ADD CONSTRAINT "PaiementEcheance_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementEcheance" ADD CONSTRAINT "PaiementEcheance_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementEcheance" ADD CONSTRAINT "PaiementEcheance_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurRecu" ADD CONSTRAINT "CompteurRecu_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClotureCaisse" ADD CONSTRAINT "ClotureCaisse_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClotureCaisse" ADD CONSTRAINT "ClotureCaisse_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleRelance" ADD CONSTRAINT "ModeleRelance_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE SET NULL ON UPDATE CASCADE;
