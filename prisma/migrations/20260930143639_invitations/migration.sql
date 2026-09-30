-- CreateEnum
CREATE TYPE "StatutInvitation" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REVOQUEE');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "institutId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "enseignantId" TEXT,
    "clerkInvitationId" TEXT,
    "statut" "StatutInvitation" NOT NULL DEFAULT 'EN_ATTENTE',
    "inviteParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepteeLe" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invitation_institutId_email_idx" ON "Invitation"("institutId", "email");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_institutId_fkey" FOREIGN KEY ("institutId") REFERENCES "Institut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

