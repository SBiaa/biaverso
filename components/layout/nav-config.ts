import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Compass,
  GraduationCap,
  Home,
  KeyRound,
  Lightbulb,
  LineChart,
  MoreHorizontal,
  Settings,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/dia", label: "Dia a dia", icon: CalendarCheck },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    title: "Vida",
    items: [
      { href: "/visao", label: "Central de Visão", icon: Compass },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
      { href: "/avaliacao", label: "Avaliação", icon: LineChart },
    ],
  },
  {
    title: "Biblioteca",
    items: [
      { href: "/livros", label: "Livros", icon: BookOpen },
      { href: "/conhecimento", label: "Conhecimento", icon: GraduationCap },
      { href: "/ideias", label: "Ideias", icon: Lightbulb },
    ],
  },
  {
    title: "Segurança",
    items: [{ href: "/senhas", label: "Senhas", icon: KeyRound }],
  },
  {
    title: "Sistema",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

export const bottomNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dia", label: "Dia", icon: CalendarCheck },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { href: "/mais", label: "Mais", icon: MoreHorizontal },
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);
