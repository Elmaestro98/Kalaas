-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DIRECTEUR', 'CAISSIER', 'FORMATEUR');

-- CreateEnum
CREATE TYPE "StatutInstitut" AS ENUM ('ACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "Offre" AS ENUM ('ESSENTIEL', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ESSAI', 'ACTIF', 'EXPIRE', 'ANNULE');

-- CreateTable
CREATE TABLE "Institut" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "logoUrl" TEXT,
    "adresse" TEXT,
    "ninea" TEXT,
    "telephone" TEXT,
    "telephone2" TEXT,
    "sousDomaine" TEXT,
    "piedRecu" TEXT,
    "statut" "StatutInstitut" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "offre" "Offre" NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ESSAI',
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membre" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institut_clerkOrgId_key" ON "Institut"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Institut_sousDomaine_key" ON "Institut"("sousDomaine");

-- CreateIndex
CREATE INDEX "Abonnement_institutId_idx" ON "Abonnement"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_clerkUserId_key" ON "Utilisateur"("clerkUserId");

-- CreateIndex
CREATE INDEX "Membre_utilisateurId_idx" ON "Membre"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Membre_institutId_utilisateurId_key" ON "Membre"("institutId", "utilisateurId");

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membre" ADD CONSTRAINT "Membre_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
