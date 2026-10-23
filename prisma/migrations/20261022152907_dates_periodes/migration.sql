-- CreateTable
CREATE TABLE "PeriodeScolaire" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "anneeAcademiqueId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,

    CONSTRAINT "PeriodeScolaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodeScolaire_institutId_idx" ON "PeriodeScolaire"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodeScolaire_anneeAcademiqueId_numero_key" ON "PeriodeScolaire"("anneeAcademiqueId", "numero");

-- AddForeignKey
ALTER TABLE "PeriodeScolaire" ADD CONSTRAINT "PeriodeScolaire_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodeScolaire" ADD CONSTRAINT "PeriodeScolaire_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
