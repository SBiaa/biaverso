// Constantes puras do foco do dia — usadas na rota e nos componentes.

/** Quantas tarefas cabem no foco de um dia. */
export const MAX_FOCUS = 3;

export type FocusKind = "task" | "production" | "collection" | "prospect";

/** Chave única de uma tarefa entre as tabelas: "production:abc". */
export const focusKey = (kind: FocusKind, id: string) => `${kind}:${id}`;
