import type { ProjectOption, WorkTask } from "@/components/modules/dia/WorkTasksToday";
import type { ClientOption } from "@/components/modules/ace/ContentPostModal";

/**
 * O que só a tarefa de produção tem, além do que o painel já mostra para
 * qualquer tarefa: tipo, cliente e a coluna do Kanban (o status do negócio,
 * diferente do andamento pessoal "iniciei, pausei...").
 */
export type ProductionExtras = {
  type: string;
  status: string;
  clientId: string | null;
  priority: string;
  clients: ClientOption[];
};

/** Resposta de GET /api/ace/tasks/[id]: tudo que o painel lateral precisa. */
export type ProductionPeekData = {
  task: WorkTask;
  production: ProductionExtras;
  projects: ProjectOption[];
  coverVersion: number | null;
};
