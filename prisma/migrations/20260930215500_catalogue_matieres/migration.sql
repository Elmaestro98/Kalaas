-- AlterTable
ALTER TABLE "Affectation" ADD COLUMN     "matiereId" TEXT;

-- AlterTable
ALTER TABLE "Creneau" ADD COLUMN     "matiereId" TEXT;

-- AlterTable
ALTER TABLE "Seance" ADD COLUMN     "enseignantId" TEXT,
ADD COLUMN     "matiereId" TEXT;

-- CreateTable
CREATE TABLE "Matiere" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "code" TEXT,
    "volumeHoraire" INTEGER,
    "heuresCM" INTEGER,
    "heuresTD" INTEGER,
    "heuresTP" INTEGER,
    "coefficient" INTEGER,
    "credits" INTEGER,
    "semestre" INTEGER,
    "ue" TEXT,
    "enseignantHabituelId" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matiere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Matiere_institutId_idx" ON "Matiere"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "Matiere_formationId_intitule_key" ON "Matiere"("formationId", "intitule");

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_enseignantHabituelId_fkey" FOREIGN KEY ("enseignantHabituelId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creneau" ADD CONSTRAINT "Creneau_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Reprise des données : les matières saisies en texte deviennent de vraies matières ───

-- Une matière par formation et par intitulé (sans tenir compte des majuscules)
INSERT INTO "Matiere" ("id", "institutId", "formationId", "intitule", "ordre", "active", "createdAt", "updatedAt")
SELECT
    'mat_' || md5(s."formationId" || '|' || lower(trim(t."matiere"))),
    s."institutId",
    s."formationId",
    min(trim(t."matiere")),
    0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT "sessionId", "matiere" FROM "Creneau"
    UNION ALL
    SELECT "sessionId", "matiere" FROM "Affectation"
    UNION ALL
    SELECT "sessionId", "matiere" FROM "Seance" WHERE "matiere" IS NOT NULL
) t
JOIN "Session" s ON s."id" = t."sessionId"
GROUP BY s."institutId", s."formationId", lower(trim(t."matiere"));

-- Rattachement des cours, affectations et séances à leur matière
UPDATE "Creneau" c SET "matiereId" = 'mat_' || md5(s."formationId" || '|' || lower(trim(c."matiere")))
FROM "Session" s WHERE s."id" = c."sessionId";

UPDATE "Affectation" a SET "matiereId" = 'mat_' || md5(s."formationId" || '|' || lower(trim(a."matiere")))
FROM "Session" s WHERE s."id" = a."sessionId";

UPDATE "Seance" se SET "matiereId" = 'mat_' || md5(s."formationId" || '|' || lower(trim(se."matiere")))
FROM "Session" s WHERE s."id" = se."sessionId" AND se."matiere" IS NOT NULL;

-- Le professeur d'une séance déjà faite = celui du cours à ce moment-là
UPDATE "Seance" se SET "enseignantId" = c."enseignantId"
FROM "Creneau" c WHERE c."id" = se."creneauId";
