import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeOrigin = "ACE" | "BIATRIX_TAROT" | "CREATIVE" | "PESSOAL" | "CASA";

export const originLabels: Record<BadgeOrigin, string> = {
  ACE: "Ace",
  BIATRIX_TAROT: "Tarot",
  CREATIVE: "Creative",
  PESSOAL: "Pessoal",
  CASA: "Casa",
};

const originStyles: Record<BadgeOrigin, string> = {
  ACE: "bg-badge-ace-bg text-badge-ace-text",
  BIATRIX_TAROT: "bg-badge-tarot-bg text-badge-tarot-text",
  CREATIVE: "bg-badge-creative-bg text-badge-creative-text",
  PESSOAL: "bg-badge-pessoal-bg text-badge-pessoal-text",
  CASA: "bg-badge-casa-bg text-badge-casa-text",
};

type BadgeProps = {
  origin?: BadgeOrigin;
  children?: ReactNode;
  className?: string;
};

export function Badge({ origin, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        origin ? originStyles[origin] : "bg-border text-text-secondary",
        className,
      )}
    >
      {children ?? (origin ? originLabels[origin] : null)}
    </span>
  );
}
