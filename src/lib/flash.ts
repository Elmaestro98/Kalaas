import "server-only";
import { cookies } from "next/headers";

// Message de confirmation affiché une seule fois après une opération réussie.
// L'action serveur le dépose dans un cookie court ; la mise en page de l'application
// le lit et l'affiche en notification, puis le navigateur efface le cookie.

export const COOKIE_FLASH = "kalaas_flash";

export type Flash = { id: string; message: string };

// À appeler dans une action serveur, juste avant le redirect ou le return de succès
export async function flash(message: string): Promise<void> {
  const valeur: Flash = { id: crypto.randomUUID(), message };
  (await cookies()).set(COOKIE_FLASH, JSON.stringify(valeur), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false, // le navigateur doit pouvoir l'effacer une fois affiché
  });
}

export async function lireFlash(): Promise<Flash | null> {
  const brut = (await cookies()).get(COOKIE_FLASH)?.value;
  if (!brut) return null;
  try {
    const valeur = JSON.parse(brut) as Partial<Flash>;
    return typeof valeur.id === "string" && typeof valeur.message === "string"
      ? { id: valeur.id, message: valeur.message.slice(0, 200) }
      : null;
  } catch {
    return null;
  }
}
