-- CreateTable
CREATE TABLE "Affectation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "matiere" TEXT NOT NULL,
    "volumeHoraire" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affectation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Affectation_institutId_idx" ON "Affectation"("institutId");

-- CreateIndex
CREATE INDEX "Affectation_enseignantId_idx" ON "Affectation"("enseignantId");

-- CreateIndex
CREATE UNIQUE INDEX "Affectation_sessionId_matiere_key" ON "Affectation"("sessionId", "matiere");

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

