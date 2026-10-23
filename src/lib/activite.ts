import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

// Suivi de la plateforme : jours d'utilisation de chaque personne dans chaque établissement.
// Au plus une écriture toutes les 5 minutes par personne et par établissement (mémoire du serveur),
// faite après l'envoi de la réponse pour ne jamais ralentir les pages.

const INTERVALLE_MS = 5 * 60 * 1000;
const dernieresEcritures = new Map<string, number>();

export function noterActivite(utilisateurId: string, institutId: string) {
  const maintenant = new Date();
  const jour = maintenant.toISOString().slice(0, 10);
  const cle = `${utilisateurId}:${institutId}:${jour}`;
  const precedente = dernieresEcritures.get(cle);
  if (precedente && maintenant.getTime() - precedente < INTERVALLE_MS) return;
  if (dernieresEcritures.size > 10_000) dernieresEcritures.clear(); // évite que la mémoire grossisse sans fin
  dernieresEcritures.set(cle, maintenant.getTime());

  after(async () => {
    try {
      await prisma.activiteJour.upsert({
        where: { utilisateurId_institutId_jour: { utilisateurId, institutId, jour: new Date(jour) } },
        create: { utilisateurId, institutId, jour: new Date(jour), derniere: maintenant },
        update: { derniere: maintenant },
      });
    } catch (erreur) {
      // Le suivi ne doit jamais casser l'application
      dernieresEcritures.delete(cle);
      console.error("Suivi d'activité impossible", erreur);
    }
  });
}
