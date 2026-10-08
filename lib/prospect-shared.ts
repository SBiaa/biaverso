// Constantes puras da prospecção — usadas na rota e nos componentes.

/** Etapas em ordem; concluir um passo só avança, nunca volta a etapa. */
const STAGE_ORDER = ["NOVO_CONTATO", "CONTATO_FEITO", "PROPOSTA_ENVIADA", "NEGOCIACAO"] as const;

export type DefaultStep = {
  key: string;
  title: string;
  /** Concluir o passo conta como contato: grava o "último contato" de hoje. */
  contact: boolean;
  /** Etapa que este passo empurra o prospect para (se ele ainda estiver antes). */
  advanceTo?: (typeof STAGE_ORDER)[number];
};

/** Checklist padrão, na ordem em que a prospecção costuma acontecer. */
export const DEFAULT_STEPS: DefaultStep[] = [
  { key: "PESQUISA", title: "Pesquisar o perfil e o negócio", contact: false },
  { key: "CONTATO", title: "Fazer o primeiro contato", contact: true, advanceTo: "CONTATO_FEITO" },
  { key: "DIAGNOSTICO", title: "Enviar o diagnóstico", contact: true },
  { key: "PROPOSTA_CRIADA", title: "Criar a proposta", contact: false },
  {
    key: "PROPOSTA_ENVIADA",
    title: "Enviar a proposta",
    contact: true,
    advanceTo: "PROPOSTA_ENVIADA",
  },
  { key: "FOLLOWUP", title: "Fazer follow-up", contact: true },
  { key: "REUNIAO", title: "Marcar reunião", contact: false },
];

export function stepEffect(key: string | null) {
  return DEFAULT_STEPS.find((s) => s.key === key) ?? null;
}

/**
 * Das tarefas abertas, deixa só o próximo passo padrão de cada prospect: "Enviar
 * a proposta" só aparece depois de "Criar a proposta" concluída. Passos próprios
 * (sem `key` padrão) passam direto.
 */
export function onlyNextSteps<T extends { key: string | null; clientBusinessId: string }>(
  open: T[],
): T[] {
  const index = (key: string | null) => DEFAULT_STEPS.findIndex((s) => s.key === key);
  const next = new Map<string, number>();
  for (const t of open) {
    const i = index(t.key);
    if (i < 0) continue;
    const cur = next.get(t.clientBusinessId);
    if (cur === undefined || i < cur) next.set(t.clientBusinessId, i);
  }
  return open.filter((t) => {
    const i = index(t.key);
    return i < 0 || next.get(t.clientBusinessId) === i;
  });
}

/** Devolve a etapa nova se `target` está à frente de `current`; senão, nulo. */
export function advancedStage(current: string | null, target: string | undefined) {
  if (!target) return null;
  const from = STAGE_ORDER.findIndex((s) => s === (current ?? "NOVO_CONTATO"));
  const to = STAGE_ORDER.findIndex((s) => s === target);
  return to > from ? target : null;
}
