import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  Compass,
  Droplet,
  FolderKanban,
  Gift,
  GraduationCap,
  Home,
  KeyRound,
  Lightbulb,
  LineChart,
  Moon,
  MessageCircle,
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
  /** Outras rotas em que o item também fica aceso ("Planejar" cobre três telas). */
  alsoActiveOn?: string[];
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
      { href: "/horas", label: "Controle de horas", icon: Clock },
      // O que foi começado e parou — a única tela do app que olha ausência.
      { href: "/radar", label: "Radar", icon: Radar },
      // Quem está esperando resposta sua no WhatsApp, e há quanto tempo.
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
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
      // Visão, Ano e Avaliação se sobrepunham (orçamento, retrospectiva...):
      // agora são um item só, com uma barra no topo para trocar entre elas.
      { href: "/visao", label: "Planejar", icon: Compass, alsoActiveOn: ["/ano", "/avaliacao"] },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      // Fica colada no financeiro porque é dinheiro: a lista soma preço e
      // compara com o que sobra do mês. Na Biblioteca era só uma lista.
      { href: "/desejos", label: "Lista de desejos", icon: Gift },
      { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
      { href: "/beleza", label: "Beleza", icon: Sparkles },
      { href: "/ciclo", label: "Ciclo", icon: Droplet },
      // Coven, roda do ano, estudos e diário. Fica na Vida, e não na
      // Biblioteca, porque tem calendário e prazo — é rotina, não acervo.
      { href: "/espiritual", label: "Espiritual", icon: Moon },
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
    // Senhas e Configurações eram dois grupos de um item só cada: duas linhas
    // de título para dois links.
    title: "Sistema",
    items: [
      { href: "/senhas", label: "Senhas", icon: KeyRound },
      // Página à parte, e não aba da Avaliação, para não encher o que já existe:
      // é sobre o app, não sobre a vida dela.
      { href: "/uso", label: "Uso do app", icon: Activity },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export const bottomNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dia", label: "Dia", icon: CalendarCheck },
  // Agenda no lugar do Cardápio: é a tela que se abre várias vezes no dia.
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/mais", label: "Mais", icon: MoreHorizontal },
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

/** Uma tela que não está no menu, mas que a busca (Ctrl+K) precisa achar. */
export type SearchPage = NavItem & {
  group: string;
  /** Outras palavras que levam até ela ("orçamento" → Planejamento). */
  keywords?: string[];
};

/**
 * As abas internas de cada módulo. Sem isto, "Dívidas", "Despensa" ou
 * "Tiragens" não davam resultado na busca, porque só os itens do menu eram
 * procurados — e com mais de vinte módulos a busca é o atalho que mais rende.
 */
export const searchPages: SearchPage[] = [
  // As três telas de "Planejar" continuam acháveis pelo nome antigo.
  { href: "/visao", label: "Central de Visão", icon: Compass, group: "Planejar", keywords: ["pilar", "propósito", "metas", "objetivos"] },
  { href: "/ano", label: "Planejamento do ano", icon: CalendarRange, group: "Planejar", keywords: ["palavra do ano", "ano"] },
  { href: "/avaliacao", label: "Avaliação", icon: LineChart, group: "Planejar", keywords: ["revisão", "retrospectiva"] },
  { href: "/financeiro/planejamento", label: "Planejamento financeiro", icon: Wallet, group: "Financeiro", keywords: ["orçamento", "previsão", "entrada prevista"] },
  { href: "/financeiro/transacoes", label: "Transações", icon: Wallet, group: "Financeiro", keywords: ["gasto", "entrada", "saída", "extrato"] },
  { href: "/financeiro/contas-fixas", label: "Contas fixas", icon: Wallet, group: "Financeiro", keywords: ["boleto", "assinatura", "aluguel"] },
  { href: "/financeiro/cartao", label: "Cartão de crédito", icon: Wallet, group: "Financeiro", keywords: ["fatura", "parcela"] },
  { href: "/financeiro/dividas", label: "Dívidas", icon: Wallet, group: "Financeiro" },
  { href: "/financeiro/investimentos", label: "Investimentos", icon: Wallet, group: "Financeiro", keywords: ["aporte", "reserva"] },
  { href: "/cardapio/receitas", label: "Receitas", icon: UtensilsCrossed, group: "Cardápio" },
  { href: "/cardapio/despensa", label: "Despensa", icon: UtensilsCrossed, group: "Cardápio", keywords: ["estoque", "mercado", "lista de compras"] },
  { href: "/beleza/rotinas", label: "Rotinas de beleza", icon: Sparkles, group: "Beleza", keywords: ["skincare"] },
  { href: "/beleza/cronogramas", label: "Cronogramas", icon: Sparkles, group: "Beleza", keywords: ["cronograma capilar", "cabelo"] },
  { href: "/beleza/cuidados", label: "Cuidados", icon: Sparkles, group: "Beleza", keywords: ["unha", "sobrancelha", "salão"] },
  { href: "/beleza/produtos", label: "Produtos de beleza", icon: Sparkles, group: "Beleza" },
  { href: "/espiritual/roda", label: "Roda do ano", icon: Moon, group: "Espiritual", keywords: ["sabbat"] },
  { href: "/espiritual/coven", label: "Coven", icon: Moon, group: "Espiritual", keywords: ["encontro"] },
  { href: "/espiritual/estudos", label: "Textos e exercícios", icon: Moon, group: "Espiritual", keywords: ["estudo"] },
  { href: "/espiritual/rituais", label: "Diário de rituais", icon: Moon, group: "Espiritual", keywords: ["ritual"] },
  { href: "/espiritual/tiragens", label: "Tiragens", icon: Moon, group: "Espiritual", keywords: ["tarot", "oráculo"] },
  { href: "/espiritual/altar", label: "Altar", icon: Moon, group: "Espiritual", keywords: ["erva", "cristal", "vela"] },
  { href: "/avaliacao/semana", label: "Avaliação da semana", icon: LineChart, group: "Avaliação", keywords: ["revisão semanal"] },
  { href: "/avaliacao/mes", label: "Avaliação do mês", icon: LineChart, group: "Avaliação" },
  { href: "/avaliacao/trimestre", label: "Avaliação do trimestre", icon: LineChart, group: "Avaliação", keywords: ["retrospectiva"] },
  { href: "/horas/calendario", label: "Calendário de horas", icon: Clock, group: "Controle de horas" },
  { href: "/produtos/insumos", label: "Insumos", icon: Package, group: "Produtos", keywords: ["material", "custo"] },
  { href: "/clientes?kind=prospect", label: "Prospects", icon: Users, group: "Clientes", keywords: ["prospecção", "lead"] },
];
