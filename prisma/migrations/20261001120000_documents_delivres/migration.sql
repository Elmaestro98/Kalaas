-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE');

-- CreateTable
CREATE TABLE "DocumentDelivre" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "numero" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "motif" TEXT,
    "contenu" JSONB NOT NULL,
    "delivreParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDelivre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurDocument" (
    "institutId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurDocument_pkey" PRIMARY KEY ("institutId","type","annee")
);

-- CreateIndex
CREATE INDEX "DocumentDelivre_institutId_createdAt_idx" ON "DocumentDelivre"("institutId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentDelivre_inscriptionId_idx" ON "DocumentDelivre"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDelivre_institutId_numero_key" ON "DocumentDelivre"("institutId", "numero");

-- AddForeignKey
ALTER TABLE "DocumentDelivre" ADD CONSTRAINT "DocumentDelivre_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDelivre" ADD CONSTRAINT "DocumentDelivre_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDelivre" ADD CONSTRAINT "DocumentDelivre_delivreParId_fkey" FOREIGN KEY ("delivreParId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurDocument" ADD CONSTRAINT "CompteurDocument_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

