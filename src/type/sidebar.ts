import type { Role } from "@prisma/client";

export type SidebarProps = {
  role: Role;
  footer: string;
  // « Élèves », « Étudiants » ou « Apprenants » selon le type d'établissement
  libelleApprenants: string;
};