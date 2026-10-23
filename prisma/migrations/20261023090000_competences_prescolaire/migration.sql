-- CreateEnum
CREATE TYPE "NiveauAcquisition" AS ENUM ('ACQUIS', 'EN_COURS', 'NON_ACQUIS');

-- CreateTable
CREATE TABLE "AcquisitionCompetence" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "periode" INTEGER NOT NULL,
    "niveau" "NiveauAcquisition" NOT NULL,
    "auteurId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcquisitionCompetence_institutId_idx" ON "AcquisitionCompetence"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionCompetence_inscriptionId_periode_matiereId_key" ON "AcquisitionCompetence"("inscriptionId", "periode", "matiereId");

-- AddForeignKey
ALTER TABLE "AcquisitionCompetence" ADD CONSTRAINT "AcquisitionCompetence_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionCompetence" ADD CONSTRAINT "AcquisitionCompetence_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionCompetence" ADD CONSTRAINT "AcquisitionCompetence_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

