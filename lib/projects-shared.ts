/**
 * Parte client-safe da visão de projetos: tipos, rótulos e ordenação. Não
 * importa "@/lib/prisma", então pode ser usado dentro de componentes "use client".
 */

export type ProjectCard = {
  id: string;
  name: string;
  status: string;
  isInternal: boolean;
  businessId: string;
  businessName: string;
  businessColor: string;
  clientName: string | null;
  totalItems: number;
  doneItems: number;
  /** 0–100. Projeto sem itens vale 0. */
  progress: number;
  nextDeadline: string | null;
  overdue: boolean;
};

export type ProjectsOverview = {
  projects: ProjectCard[];
  summary: {
    activeProjects: number;
    pendingTasks: number;
    dueThisWeek: number;
    overdueProjects: number;
  };
};

// Os rótulos ficam em "@/lib/labels" junto com os demais do app.
export const projectStatusColors: Record<string, string> = {
  EM_ANDAMENTO: "#2563EB",
  CONCLUIDO: "#059669",
  PAUSADO: "#D97706",
  CANCELADO: "#6B7280",
};

export const projectSortOptions = ["prazo", "status", "alfabetica"] as const;
export type ProjectSort = (typeof projectSortOptions)[number];

/** Ordena os cards já montados — usado no servidor e no cliente. */
export function sortProjectCards(cards: ProjectCard[], sort: ProjectSort) {
  const sorted = [...cards];

  if (sort === "alfabetica") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  if (sort === "status") {
    const order = ["EM_ANDAMENTO", "PAUSADO", "CONCLUIDO", "CANCELADO"];
    return sorted.sort(
      (a, b) =>
        order.indexOf(a.status) - order.indexOf(b.status) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  }

  // Por prazo: quem não tem prazo vai para o fim, senão um projeto sem data
  // ficaria sempre no topo por comparar como string vazia.
  return sorted.sort((a, b) => {
    if (!a.nextDeadline && !b.nextDeadline) {
      return a.name.localeCompare(b.name, "pt-BR");
    }
    if (!a.nextDeadline) return 1;
    if (!b.nextDeadline) return -1;
    return a.nextDeadline.localeCompare(b.nextDeadline);
  });
}
