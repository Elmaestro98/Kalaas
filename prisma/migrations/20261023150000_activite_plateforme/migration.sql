-- CreateTable
CREATE TABLE "ActiviteJour" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "jour" DATE NOT NULL,
    "derniere" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiviteJour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiviteJour_jour_idx" ON "ActiviteJour"("jour");

-- CreateIndex
CREATE INDEX "ActiviteJour_institutId_jour_idx" ON "ActiviteJour"("institutId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "ActiviteJour_utilisateurId_institutId_jour_key" ON "ActiviteJour"("utilisateurId", "institutId", "jour");

-- AddForeignKey
ALTER TABLE "ActiviteJour" ADD CONSTRAINT "ActiviteJour_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiviteJour" ADD CONSTRAINT "ActiviteJour_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

