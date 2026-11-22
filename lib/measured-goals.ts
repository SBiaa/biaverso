import { closedMeasuredGoalStatuses } from "@/lib/labels";
import { todayUtc } from "@/lib/utils";

/**
 * Data de encerramento ao gravar um status. Fechar marca hoje; reabrir limpa;
 * mudar entre dois status fechados (ex.: Não atingido → Concluído) mantém o
 * dia original, para a meta não pular de mês na avaliação.
 */
export function closedAtFor(status: string, currentClosedAt: Date | null = null) {
  if (!closedMeasuredGoalStatuses.includes(status)) return null;
  return currentClosedAt ?? todayUtc();
}
