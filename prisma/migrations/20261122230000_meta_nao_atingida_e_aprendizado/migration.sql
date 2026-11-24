-- Meta que chegou ao prazo sem ser batida ganha status próprio, em vez de
-- ficar como "Cancelado" (que significa desistência). Mais o aprendizado
-- registrado ao encerrar e a data de encerramento, que põe a meta na
-- avaliação do mês e do trimestre em que fechou.

ALTER TYPE "MeasuredGoalStatus" ADD VALUE 'NAO_ATINGIDO';

ALTER TABLE "MeasuredGoal" ADD COLUMN "lesson" TEXT,
ADD COLUMN "closedAt" TIMESTAMP(3);

-- Metas já encerradas: a melhor aproximação é a última edição, no dia local.
UPDATE "MeasuredGoal"
SET "closedAt" = date_trunc('day', "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
WHERE "status" IN ('CONCLUIDO', 'CANCELADO');

CREATE INDEX "MeasuredGoal_closedAt_idx" ON "MeasuredGoal"("closedAt");
