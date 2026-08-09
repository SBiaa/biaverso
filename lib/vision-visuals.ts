import {
  Briefcase,
  Compass,
  Globe,
  Heart,
  Moon,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const PILLAR_COLORS = [
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#DC2626",
  "#0891B2",
  "#65A30D",
];

export const PILLAR_ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  moon: Moon,
  briefcase: Briefcase,
  palette: Palette,
  users: Users,
  star: Star,
  zap: Zap,
  globe: Globe,
  sparkles: Sparkles,
  rocket: Rocket,
};

export function getPillarIcon(icon?: string | null): LucideIcon {
  return (icon && PILLAR_ICONS[icon]) || Compass;
}
