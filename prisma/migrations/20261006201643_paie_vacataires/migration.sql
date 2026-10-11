-- CreateEnum
CREATE TYPE "StatutVacation" AS ENUM ('VALIDEE', 'PAYEE');

-- CreateTable
CREATE TABLE "Vacation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "mois" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "tarifHoraire" INTEGER NOT NULL,
    "montantBrut" INTEGER NOT NULL,
    "ajustement" INTEGER NOT NULL DEFAULT 0,
    "motifAjustement" TEXT,
    "montantNet" INTEGER NOT NULL,
    "detail" JSONB NOT NULL,
    "statut" "StatutVacation" NOT NULL DEFAULT 'VALIDEE',
    "modePaiement" "ModePaiement",
    "referencePaiement" TEXT,
    "payeeLe" TIMESTAMP(3),
    "valideeParId" TEXT NOT NULL,
    "payeeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurVacation" (
    "institutId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurVacation_pkey" PRIMARY KEY ("institutId","annee")
);

-- CreateIndex
CREATE INDEX "Vacation_institutId_mois_idx" ON "Vacation"("institutId", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "Vacation_enseignantId_mois_key" ON "Vacation"("enseignantId", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "Vacation_institutId_numero_key" ON "Vacation"("institutId", "numero");

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_valideeParId_fkey" FOREIGN KEY ("valideeParId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_payeeParId_fkey" FOREIGN KEY ("payeeParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurVacation" ADD CONSTRAINT "CompteurVacation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
