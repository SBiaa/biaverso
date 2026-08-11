import type { ModuleType } from "@/app/generated/prisma/client";

/**
 * Módulos de um negócio. Puro de propósito — nada aqui importa "@/lib/prisma",
 * então tanto as páginas quanto os componentes "use client" podem usar.
 *
 * As abas da página do negócio saem daqui: quem decide o que aparece é a lista
 * de BusinessModule ativos, na ordem gravada.
 */

/** Ordem em que os módulos aparecem nos seletores. */
export const MODULE_TYPES: ModuleType[] = [
  "CRONOGRAMA",
  "PRODUCAO",
  "CLIENTES",
  "PROJETOS",
  "PEDIDOS",
  "COLECOES",
  "FINANCEIRO",
];

/** O que um negócio novo ganha quando nenhum módulo é escolhido. */
export const DEFAULT_MODULES: ModuleType[] = ["CLIENTES", "PROJETOS", "FINANCEIRO"];

export const moduleLabels: Record<ModuleType, string> = {
  CRONOGRAMA: "Cronograma",
  PRODUCAO: "Produção",
  CLIENTES: "Clientes",
  PROJETOS: "Projetos",
  PEDIDOS: "Pedidos",
  COLECOES: "Coleções",
  FINANCEIRO: "Financeiro",
};

export const moduleDescriptions: Record<ModuleType, string> = {
  CRONOGRAMA: "Posts, stories e reels no calendário",
  PRODUCAO: "Tarefas de edição, arte e site no kanban",
  CLIENTES: "Gestão de clientes do negócio",
  PROJETOS: "Projetos internos e de cliente",
  PEDIDOS: "Controle de pedidos da loja",
  COLECOES: "Coleções sazonais de produtos",
  FINANCEIRO: "Entradas e saídas do negócio",
};

/**
 * Aba de cada módulo. `path` é uma subpágina própria (`/negocios/[id]/pedidos`);
 * sem `path`, a aba é uma seção da própria página do negócio (`?tab=`).
 */
const MODULE_TABS: Record<ModuleType, { key: string; label: string; path?: string }> = {
  CLIENTES: { key: "clientes", label: "Clientes" },
  PROJETOS: { key: "interno", label: "Interno" },
  CRONOGRAMA: { key: "calendario", label: "Calendário" },
  PRODUCAO: { key: "kanban", label: "Kanban" },
  PEDIDOS: { key: "pedidos", label: "Pedidos", path: "pedidos" },
  COLECOES: { key: "colecoes", label: "Coleções", path: "colecoes" },
  FINANCEIRO: { key: "financeiro", label: "Financeiro" },
};

export type BusinessTab = {
  key: string;
  label: string;
  href: string;
  /** Subpágina própria: o link não carrega os filtros da aba atual. */
  ownPage: boolean;
};

export type BusinessModuleState = {
  module: ModuleType;
  active: boolean;
  order: number;
};

/** Chave da home do negócio — não vem de módulo nenhum, existe sempre. */
export const OVERVIEW_TAB = "visao-geral";

/**
 * Abas visíveis de um negócio, na ordem em que os módulos foram salvos.
 *
 * A "Visão geral" vem sempre na frente: é o painel do negócio e não depende de
 * módulo ligado — abrir um negócio sem ela caía direto numa aba de trabalho,
 * sem nenhum resumo do todo.
 */
export function buildBusinessTabs(
  businessId: string,
  modules: BusinessModuleState[],
): BusinessTab[] {
  const moduleTabs = modules
    .filter((m) => m.active)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const tab = MODULE_TABS[m.module];
      return {
        key: tab.key,
        label: tab.label,
        href: tab.path
          ? `/negocios/${businessId}/${tab.path}`
          : `/negocios/${businessId}`,
        ownPage: Boolean(tab.path),
      };
    });

  return [
    {
      key: OVERVIEW_TAB,
      label: "Visão geral",
      href: `/negocios/${businessId}`,
      ownPage: false,
    },
    ...moduleTabs,
  ];
}

/**
 * Aba pedida pela URL, se o módulo dela estiver ligado. Cai na primeira aba
 * disponível — um `?tab=` de módulo desligado não pode mostrar tela vazia.
 */
export function resolveTab(tabs: BusinessTab[], requested?: string): string | null {
  const inline = tabs.filter((t) => !t.ownPage);
  if (requested && inline.some((t) => t.key === requested)) return requested;
  return inline[0]?.key ?? null;
}

/** Preenche os módulos que faltam, para a tela de configuração listar todos. */
export function withAllModules(saved: BusinessModuleState[]): BusinessModuleState[] {
  const byModule = new Map(saved.map((m) => [m.module, m]));
  const listed = saved
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => m.module);
  const missing = MODULE_TYPES.filter((m) => !byModule.has(m));

  return [...listed, ...missing].map((module, index) => ({
    module,
    active: byModule.get(module)?.active ?? false,
    order: index,
  }));
}
