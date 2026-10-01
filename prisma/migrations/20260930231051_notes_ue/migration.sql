-- CreateEnum
CREATE TYPE "TypeEvaluation" AS ENUM ('DEVOIR', 'EXAMEN', 'TP', 'ORAL', 'PROJET', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutNote" AS ENUM ('NOTEE', 'ABSENT', 'DISPENSE');


-- CreateTable
CREATE TABLE "UniteEnseignement" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "code" TEXT,
    "intitule" TEXT NOT NULL,
    "semestre" INTEGER,
    "credits" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniteEnseignement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "type" "TypeEvaluation" NOT NULL DEFAULT 'DEVOIR',
    "date" DATE,
    "poids" INTEGER NOT NULL,
    "bareme" INTEGER NOT NULL DEFAULT 20,
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,
    "creeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "statut" "StatutNote" NOT NULL DEFAULT 'NOTEE',
    "valeur" INTEGER,
    "saisieParId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UniteEnseignement_institutId_idx" ON "UniteEnseignement"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "UniteEnseignement_formationId_intitule_key" ON "UniteEnseignement"("formationId", "intitule");

-- CreateIndex
CREATE INDEX "Evaluation_sessionId_matiereId_idx" ON "Evaluation"("sessionId", "matiereId");

-- CreateIndex
CREATE INDEX "Evaluation_institutId_idx" ON "Evaluation"("institutId");

-- CreateIndex
CREATE INDEX "Note_inscriptionId_idx" ON "Note"("inscriptionId");

-- CreateIndex
CREATE INDEX "Note_institutId_idx" ON "Note"("institutId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_evaluationId_inscriptionId_key" ON "Note"("evaluationId", "inscriptionId");

-- AlterTable : nouvelle colonne ueId (la colonne texte ue est supprimée après la reprise)
ALTER TABLE "Matiere" ADD COLUMN "ueId" TEXT;

-- Reprise : chaque UE saisie en texte devient une fiche UE de sa formation
INSERT INTO "UniteEnseignement" ("id", "institutId", "formationId", "intitule", "semestre", "ordre", "active", "createdAt", "updatedAt")
SELECT 'ue_' || md5(m."formationId" || '|' || lower(trim(m."ue"))), m."institutId", m."formationId", min(trim(m."ue")), min(m."semestre"), 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Matiere" m WHERE m."ue" IS NOT NULL AND trim(m."ue") <> ''
GROUP BY m."institutId", m."formationId", lower(trim(m."ue"));

UPDATE "Matiere" SET "ueId" = 'ue_' || md5("formationId" || '|' || lower(trim("ue"))) WHERE "ue" IS NOT NULL AND trim("ue") <> '';

ALTER TABLE "Matiere" DROP COLUMN "ue";

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_ueId_fkey" FOREIGN KEY ("ueId") REFERENCES "UniteEnseignement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniteEnseignement" ADD CONSTRAINT "UniteEnseignement_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniteEnseignement" ADD CONSTRAINT "UniteEnseignement_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

