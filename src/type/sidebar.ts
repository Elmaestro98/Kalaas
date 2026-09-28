import type { Role } from "@prisma/client";

export type SidebarProps = {
  role: Role;
  footer: string;
};