-- CreateEnum
CREATE TYPE "CycleFormation" AS ENUM ('FORMATION_COURTE', 'LICENCE', 'MASTER', 'DOCTORAT');

-- CreateEnum
CREATE TYPE "TypeInscription" AS ENUM ('NOUVELLE', 'REINSCRIPTION', 'REDOUBLEMENT');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('F', 'M');

-- AlterEnum
ALTER TYPE "Offre" ADD VALUE 'CAMPUS';

-- AlterTable
ALTER TABLE "Apprenant" ADD COLUMN     "dateNaissance" DATE,
ADD COLUMN     "diplomeAcces" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "lieuNaissance" TEXT,
ADD COLUMN     "matricule" TEXT,
ADD COLUMN     "sexe" "Sexe";

-- AlterTable
ALTER TABLE "Formation" ADD COLUMN     "cycle" "CycleFormation" NOT NULL DEFAULT 'FORMATION_COURTE',
ADD COLUMN     "filiere" TEXT,
ADD COLUMN     "niveau" INTEGER;

-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "inscriptionPrecedenteId" TEXT,
ADD COLUMN     "type" "TypeInscription" NOT NULL DEFAULT 'NOUVELLE';

-- AlterTable
ALTER TABLE "Institut" ADD COLUMN     "prefixeMatricule" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "anneeAcademiqueId" TEXT;

-- CreateTable
CREATE TABLE "AnneeAcademique" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "enCours" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnneeAcademique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurMatricule" (
    "institutId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurMatricule_pkey" PRIMARY KEY ("institutId","annee")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnneeAcademique_institutId_libelle_key" ON "AnneeAcademique"("institutId", "libelle");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_institutId_matricule_key" ON "Apprenant"("institutId", "matricule");

-- CreateIndex
CREATE INDEX "Formation_institutId_cycle_filiere_niveau_idx" ON "Formation"("institutId", "cycle", "filiere", "niveau");

-- CreateIndex
CREATE INDEX "Inscription_inscriptionPrecedenteId_idx" ON "Inscription"("inscriptionPrecedenteId");

-- CreateIndex
CREATE INDEX "Session_anneeAcademiqueId_idx" ON "Session"("anneeAcademiqueId");

-- AddForeignKey
ALTER TABLE "AnneeAcademique" ADD CONSTRAINT "AnneeAcademique_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_inscriptionPrecedenteId_fkey" FOREIGN KEY ("inscriptionPrecedenteId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurMatricule" ADD CONSTRAINT "CompteurMatricule_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

