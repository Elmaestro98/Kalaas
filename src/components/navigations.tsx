import type { Role } from "@prisma/client";
import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import type { NavSection } from "@/type/navSection";

const TOUS: Role[] = ["DIRECTEUR", "CAISSIER", "FORMATEUR"];
const BUREAU: Role[] = ["DIRECTEUR", "CAISSIER"];

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        roles: TOUS,
      },
    ],
  },
  {
    title: "Scolarité",
    items: [
      { href: "/students", label: "Etudiant", icon: Users, roles: BUREAU },
      {
        href: "/enrollments",
        label: "Inscriptions",
        icon: ClipboardList,
        roles: BUREAU,
      },
      {
        href: "/courses",
        label: "Formations",
        icon: BookOpen,
        roles: ["DIRECTEUR"],
      },
      {
        href: "/attendance",
        label: "Présences",
        icon: CalendarCheck,
        roles: TOUS,
      },
      {
        href: "/teachers",
        label: "Professeurs",
        icon: GraduationCap,
        roles: BUREAU,
      },
      {
        href: "/timetable",
        label: "Emplois du temps",
        icon: CalendarDays,
        roles: TOUS,
      },
    ],
  },
  {
    title: "Finances",
    items: [
      {
        href: "/payments",
        label: "Encaissements",
        icon: Wallet,
        roles: BUREAU,
      },
      {
        href: "/unpaid",
        label: "Impayés et relances",
        icon: BellRing,
        roles: BUREAU,
      },
      {
        href: "/reports",
        label: "Rapports",
        icon: BarChart3,
        roles: ["DIRECTEUR"],
      },
    ],
  },
  {
    title: "Réglages",
    items: [
      {
        href: "/team",
        label: "Équipe",
        icon: UserCog,
        roles: ["DIRECTEUR"],
      },
      {
        href: "/settings",
        label: "Paramètres",
        icon: Settings,
        roles: ["DIRECTEUR"],
      },
    ],
  },
];

export const ROLE_LABELS: Record<Role, string> = {
  DIRECTEUR: "Directeur",
  CAISSIER: "Caissier",
  FORMATEUR: "Formateur",
};
