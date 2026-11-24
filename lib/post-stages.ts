/**
 * Modelos de etapas das tarefas de produção dos clientes. São só um ponto de
 * partida: ao aplicar, os passos viram passos comuns da tarefa e podem ser
 * renomeados, apagados ou ganhar etapas novas.
 */

export type StageTemplateStep = { title: string; stage: string };

type StageTemplate = { name: string; stages: { name: string; steps: string[] }[] };

// Chave = valor de ProductionType. Site e Outro ficam de fora: não têm um
// caminho padrão, e um modelo errado atrapalha mais do que ajuda.
const templates: Record<string, StageTemplate> = {
  EDICAO_VIDEO: {
    name: "Vídeo",
    stages: [
      { name: "Roteiro", steps: ["Escrever o roteiro"] },
      { name: "Gravação", steps: ["Gravar"] },
      { name: "Edição", steps: ["Cortar e montar", "Legendas e áudio", "Revisar"] },
      { name: "Postagem", steps: ["Legenda e hashtags", "Postar ou agendar"] },
    ],
  },
  CRIACAO_ARTE: {
    name: "Arte",
    stages: [
      { name: "Briefing", steps: ["Entender o pedido e as referências"] },
      { name: "Criação", steps: ["Montar a arte", "Revisar texto e cores"] },
      { name: "Aprovação", steps: ["Enviar para aprovação", "Fazer os ajustes"] },
      { name: "Postagem", steps: ["Legenda e hashtags", "Postar ou agendar"] },
    ],
  },
  FOTOGRAFIA: {
    name: "Foto",
    stages: [
      { name: "Planejamento", steps: ["Definir ideias e referências"] },
      { name: "Captação", steps: ["Fotografar"] },
      { name: "Tratamento", steps: ["Escolher as fotos", "Tratar as fotos"] },
      { name: "Entrega", steps: ["Enviar ao cliente"] },
    ],
  },
  COPY: {
    name: "Copy",
    stages: [
      { name: "Pesquisa", steps: ["Entender o assunto e o público"] },
      { name: "Escrita", steps: ["Escrever o texto"] },
      { name: "Revisão", steps: ["Revisar e ajustar"] },
      { name: "Entrega", steps: ["Enviar ao cliente"] },
    ],
  },
};

/** Nome curto do modelo ("Vídeo") ou null quando o tipo não tem modelo. */
export function stageTemplateName(type: string): string | null {
  return templates[type]?.name ?? null;
}

/** Os passos do modelo do tipo, já com a etapa, na ordem de execução. */
export function stageTemplateSteps(type: string): StageTemplateStep[] {
  const template = templates[type];
  if (!template) return [];
  return template.stages.flatMap((stage) =>
    stage.steps.map((title) => ({ title, stage: stage.name })),
  );
}

/** Nomes das etapas do modelo, para mostrar o que será criado. */
export function stageTemplateStages(type: string): string[] {
  return templates[type]?.stages.map((s) => s.name) ?? [];
}
