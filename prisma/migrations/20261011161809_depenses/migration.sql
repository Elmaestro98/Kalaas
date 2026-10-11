-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('LOYER', 'EAU_ELECTRICITE', 'INTERNET_TELEPHONE', 'SALAIRES', 'FOURNITURES', 'PUBLICITE', 'AUTRE');

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "montant" INTEGER NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "description" TEXT NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "saisieParId" TEXT NOT NULL,
    "annuleeLe" TIMESTAMP(3),
    "annuleeParId" TEXT,
    "motifAnnulation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Depense_institutId_date_idx" ON "Depense"("institutId", "date");

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_annuleeParId_fkey" FOREIGN KEY ("annuleeParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
