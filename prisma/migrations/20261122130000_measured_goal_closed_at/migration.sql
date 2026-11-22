-- Data em que a meta foi encerrada, para ela aparecer na avaliação do mês e
-- do trimestre em que fechou (o prazo nem sempre coincide).

ALTER TABLE "MeasuredGoal" ADD COLUMN "closedAt" TIMESTAMP(3);

-- Metas já encerradas: a melhor aproximação é a última edição, no dia local.
UPDATE "MeasuredGoal"
SET "closedAt" = date_trunc('day', "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
WHERE "status" IN ('CONCLUIDO', 'NAO_ATINGIDO', 'CANCELADO');

CREATE INDEX "MeasuredGoal_closedAt_idx" ON "MeasuredGoal"("closedAt");
