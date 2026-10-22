-- CreateEnum
CREATE TYPE "DecoupageScolaire" AS ENUM ('TRIMESTRES', 'SEMESTRES');

-- CreateEnum
CREATE TYPE "Distinction" AS ENUM ('FELICITATIONS', 'ENCOURAGEMENTS', 'TABLEAU_HONNEUR', 'AVERTISSEMENT', 'BLAME');

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "periode" INTEGER;

-- AlterTable
ALTER TABLE "Institut" ADD COLUMN     "decoupageScolaire" "DecoupageScolaire" NOT NULL DEFAULT 'TRIMESTRES';

-- CreateTable
CREATE TABLE "AppreciationMatiere" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "periode" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "auteurId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppreciationMatiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConseilClasse" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "periode" INTEGER NOT NULL,
    "appreciation" TEXT,
    "distinction" "Distinction",
    "auteurId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConseilClasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppreciationMatiere_institutId_idx" ON "AppreciationMatiere"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "AppreciationMatiere_inscriptionId_periode_matiereId_key" ON "AppreciationMatiere"("inscriptionId", "periode", "matiereId");

-- CreateIndex
CREATE INDEX "ConseilClasse_institutId_idx" ON "ConseilClasse"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "ConseilClasse_inscriptionId_periode_key" ON "ConseilClasse"("inscriptionId", "periode");

-- AddForeignKey
ALTER TABLE "AppreciationMatiere" ADD CONSTRAINT "AppreciationMatiere_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationMatiere" ADD CONSTRAINT "AppreciationMatiere_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationMatiere" ADD CONSTRAINT "AppreciationMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConseilClasse" ADD CONSTRAINT "ConseilClasse_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConseilClasse" ADD CONSTRAINT "ConseilClasse_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
