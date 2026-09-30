import "server-only";
import { PrismaClient } from "@prisma/client";

// ─── Client brut (webhooks, jobs, super admin uniquement) ───

const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalPourPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalPourPrisma.prisma = prisma;
}

// ─── Client limité à un institut ────────────────────────────

const MODELES_INSTITUT = new Set<string>([
  "AnneeAcademique",
  "CompteurMatricule",
  "Salle",
  "Creneau",
  "Enseignant",
  "Affectation",
  "Invitation",
  "Membre",
  "Formation",
  "Session",
  "Apprenant",
  "Inscription",
  "Echeance",
  "Paiement",
  "PaiementEcheance",
  "Annulation",
  "CompteurRecu", 
  "ClotureCaisse",
  "Seance",
  "Presence",
  "ModeleRelance",
  "Relance",
  "JournalAudit",
]);

type ArgsRequete = {
  where?: object;
  data?: object | object[];
  create?: object;
};

export function dbInstitut(institutId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELES_INSTITUT.has(model)) {
            return query(args);
          }

          const a = args as ArgsRequete;

          // Lectures, mises à jour, suppressions : on filtre
          if (
            operation !== "create" &&
            operation !== "createMany" &&
            operation !== "createManyAndReturn"
          ) {
            a.where = { ...a.where, institutId };
          }

          // Créations : on impose le bon institut
          if (operation === "create") {
            a.data = { ...a.data, institutId };
          }
          if (
            operation === "createMany" ||
            operation === "createManyAndReturn"
          ) {
            const lignes = Array.isArray(a.data) ? a.data : [a.data];
            a.data = lignes.map((ligne) => ({ ...ligne, institutId }));
          }
          if (operation === "upsert") {
            a.create = { ...a.create, institutId };
          }

          return query(a as typeof args);
        },
      },
    },
  });
}

export type DbInstitut = ReturnType<typeof dbInstitut>;
