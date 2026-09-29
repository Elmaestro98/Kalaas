-- Fiches Professeur (avec ou sans compte Kalaas) : les cours pointent désormais
-- vers une fiche Enseignant au lieu d'un Membre.

-- CreateEnum
CREATE TYPE "StatutEnseignant" AS ENUM ('PERMANENT', 'VACATAIRE');

-- DropForeignKey
ALTER TABLE "Creneau" DROP CONSTRAINT "Creneau_enseignantId_fkey";

-- CreateTable
CREATE TABLE "Enseignant" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "specialite" TEXT,
    "statut" "StatutEnseignant" NOT NULL DEFAULT 'VACATAIRE',
    "tarifHoraire" INTEGER,
    "membreId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enseignant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enseignant_membreId_key" ON "Enseignant"("membreId");

-- CreateIndex
CREATE INDEX "Enseignant_institutId_nom_idx" ON "Enseignant"("institutId", "nom");

-- Reprise des données : une fiche pour chaque membre qui a déjà des cours,
-- reliée à son compte (prénom = premier mot du nom, nom = le reste).
INSERT INTO "Enseignant" ("id", "institutId", "prenom", "nom", "email", "statut", "membreId", "actif", "createdAt", "updatedAt")
SELECT DISTINCT
    'ens_' || m."id",
    m."institutId",
    split_part(u."nom", ' ', 1),
    COALESCE(NULLIF(substr(u."nom", length(split_part(u."nom", ' ', 1)) + 2), ''), split_part(u."nom", ' ', 1)),
    u."email",
    'PERMANENT'::"StatutEnseignant",
    m."id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Creneau" c
JOIN "Membre" m ON m."id" = c."enseignantId"
JOIN "Utilisateur" u ON u."id" = m."utilisateurId";

-- Les cours pointent vers la nouvelle fiche
UPDATE "Creneau" SET "enseignantId" = 'ens_' || "enseignantId" WHERE "enseignantId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
