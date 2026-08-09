import {
  Briefcase,
  Box,
  Globe,
  Heart,
  Moon,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const BUSINESS_COLORS = [
  "#DC2626",
  "#7C3AED",
  "#059669",
  "#2563EB",
  "#D97706",
  "#DB2777",
  "#0891B2",
  "#65A30D",
];

export const BUSINESS_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  moon: Moon,
  palette: Palette,
  star: Star,
  heart: Heart,
  zap: Zap,
  globe: Globe,
  box: Box,
  sparkles: Sparkles,
  rocket: Rocket,
};

export function getBusinessIcon(icon?: string | null): LucideIcon {
  return (icon && BUSINESS_ICONS[icon]) || Briefcase;
}
