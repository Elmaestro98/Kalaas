-- AlterTable
ALTER TABLE "Institut" ADD COLUMN     "plafondDepenseCaissier" INTEGER;

-- CreateTable
CREATE TABLE "FondsCaisse" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "caissierId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "montant" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FondsCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FondsCaisse_institutId_caissierId_date_key" ON "FondsCaisse"("institutId", "caissierId", "date");

-- AddForeignKey
ALTER TABLE "FondsCaisse" ADD CONSTRAINT "FondsCaisse_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondsCaisse" ADD CONSTRAINT "FondsCaisse_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
