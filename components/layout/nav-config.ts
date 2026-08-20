import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  Compass,
  FolderKanban,
  Gift,
  GraduationCap,
  Home,
  KeyRound,
  Lightbulb,
  LineChart,
  Moon,
  MoreHorizontal,
  Package,
  Radar,
  Settings,
  Sparkles,
  UtensilsCrossed,
  Users,
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
  // A sidebar pendura a lista de negócios ativos logo depois dos itens deste
  // grupo: os links fixos são a entrada, os negócios vêm do banco.
  showBusinesses?: boolean;
};

export const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/dia", label: "Dia a dia", icon: CalendarCheck },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      // O que foi começado e parou — a única tela do app que olha ausência.
      { href: "/radar", label: "Radar", icon: Radar },
    ],
  },
  {
    title: "Negócios",
    showBusinesses: true,
    items: [
      { href: "/negocios", label: "Todos os negócios", icon: Building2 },
      // Visões que atravessam os negócios: projetos e clientes de todos eles
      // num lugar só, e o catálogo, que é compartilhado entre eles.
      { href: "/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/produtos", label: "Produtos", icon: Package },
    ],
  },
  {
    title: "Vida",
    items: [
      { href: "/visao", label: "Central de Visão", icon: Compass },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      // Fica colada no financeiro porque é dinheiro: a lista soma preço e
      // compara com o que sobra do mês. Na Biblioteca era só uma lista.
      { href: "/desejos", label: "Lista de desejos", icon: Gift },
      { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
      { href: "/beleza", label: "Beleza", icon: Sparkles },
      // Coven, roda do ano, estudos e diário. Fica na Vida, e não na
      // Biblioteca, porque tem calendário e prazo — é rotina, não acervo.
      { href: "/espiritual", label: "Espiritual", icon: Moon },
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
