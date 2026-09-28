import * as React from "react";
/** Bouton Kalaas. `primary` = action principale (bleu nuit en clair, or en sombre). */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}
export declare function Button(props: ButtonProps): JSX.Element;
/** Badge de statut : toujours un mot court. */
export interface BadgeProps { tone?: "success" | "warning" | "danger" | "info" | "gold" | "neutral"; dot?: boolean; children: React.ReactNode; }
export declare function Badge(props: BadgeProps): JSX.Element;
/** Carte : conteneur surface-200, radius-lg, padding space-6. */
export interface CardProps { title?: React.ReactNode; eyebrow?: React.ReactNode; aside?: React.ReactNode; footer?: React.ReactNode; accent?: boolean; onClick?: () => void; children?: React.ReactNode; }
export declare function Card(props: CardProps): JSX.Element;
/** Champ texte avec libellé, aide et erreur. Accepte tous les attributs d'<input>. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; }
export declare function Input(props: InputProps): JSX.Element;
/** Liste déroulante native stylée. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; placeholder?: string; options: Array<string | { value: string; label: string }>; }
export declare function Select(props: SelectProps): JSX.Element;
/** Tableau de données. */
export interface TableColumn<T = any> { key: string; label: React.ReactNode; align?: "left" | "right"; render?: (row: T) => React.ReactNode; }
export interface TableProps<T = any> { columns: TableColumn<T>[]; rows: T[]; empty?: React.ReactNode; }
export declare function Table(props: TableProps): JSX.Element;
/** Barre latérale bleu nuit de l'application. */
export interface SidebarItem { key: string; label: React.ReactNode; count?: number; }
export interface SidebarProps { brand?: React.ReactNode; sections: { title?: string; items: SidebarItem[] }[]; active?: string; onSelect?: (key: string) => void; footer?: React.ReactNode; }
export declare function Sidebar(props: SidebarProps): JSX.Element;
