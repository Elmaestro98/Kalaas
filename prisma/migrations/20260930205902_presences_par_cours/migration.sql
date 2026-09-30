-- DropIndex
DROP INDEX "Seance_institutId_idx";

-- DropIndex
DROP INDEX "Seance_sessionId_date_key";

-- AlterTable
ALTER TABLE "Seance" ADD COLUMN     "appelParId" TEXT,
ADD COLUMN     "creneauId" TEXT,
ADD COLUMN     "heureDebut" INTEGER,
ADD COLUMN     "heureFin" INTEGER,
ADD COLUMN     "matiere" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Seance_institutId_date_idx" ON "Seance"("institutId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Seance_sessionId_date_creneauId_key" ON "Seance"("sessionId", "date", "creneauId");

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "Creneau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_appelParId_fkey" FOREIGN KEY ("appelParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

