import type { Role } from "@prisma/client";
import {type LucideIcon} from "lucide-react"


export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};