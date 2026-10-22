-- CreateEnum
CREATE TYPE "TypeEtablissement" AS ENUM ('INSTITUT', 'UNIVERSITE', 'ECOLE');

-- AlterTable
ALTER TABLE "Institut" ADD COLUMN     "typeEtablissement" "TypeEtablissement" NOT NULL DEFAULT 'INSTITUT';
