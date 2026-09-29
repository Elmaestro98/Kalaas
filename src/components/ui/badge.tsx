import type { ReactNode } from "react";

const TONS = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  gold: "bg-gold-100 text-gold-700",
  neutral: "bg-surface-100 text-ink-muted",
} as const;

export type TonBadge = keyof typeof TONS;

type BadgeProps = {
  ton?: TonBadge;
  children: ReactNode;
};

export default function Badge({ ton = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${TONS[ton]}`}
    >
      {children}
    </span>
  );
}
