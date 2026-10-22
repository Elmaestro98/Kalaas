-- CreateEnum
CREATE TYPE "DecisionFinAnnee" AS ENUM ('PASSAGE', 'REDOUBLEMENT');

-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "decisionFinAnnee" "DecisionFinAnnee";
