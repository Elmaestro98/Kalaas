-- CreateEnum
CREATE TYPE "JourSemaine" AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE');

-- CreateTable
CREATE TABLE "Salle" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creneau" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jour" "JourSemaine" NOT NULL,
    "heureDebut" INTEGER NOT NULL,
    "heureFin" INTEGER NOT NULL,
    "matiere" TEXT NOT NULL,
    "enseignantId" TEXT,
    "salleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creneau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salle_institutId_nom_key" ON "Salle"("institutId", "nom");

-- CreateIndex
CREATE INDEX "Creneau_institutId_jour_idx" ON "Creneau"("institutId", "jour");

-- CreateIndex
CREATE INDEX "Creneau_sessionId_idx" ON "Creneau"("sessionId");

-- CreateIndex
CREATE INDEX "Creneau_enseignantId_idx" ON "Creneau"("enseignantId");

-- CreateIndex
CREATE INDEX "Creneau_salleId_idx" ON "Creneau"("salleId");

-- AddForeignKey
ALTER TABLE "Salle" ADD CONSTRAINT "Salle_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

