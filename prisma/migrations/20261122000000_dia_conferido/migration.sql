-- Dia conferido: só dias confirmados entram nas avaliações de hábitos e casa.
ALTER TABLE "Day" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- O histórico antigo não some das avaliações: dias anteriores à semana de
-- 16/11/2026 em que algo foi marcado (hábito, rotina ou humor) contam como
-- conferidos. A semana corrente fica para ela conferir na grade nova.
UPDATE "Day" d
SET "reviewedAt" = d."updatedAt"
WHERE d."date" < DATE '2026-11-16'
  AND (
    d."mood" IS NOT NULL
    OR EXISTS (SELECT 1 FROM "HabitLog" h WHERE h."dayId" = d."id" AND h."done")
    OR EXISTS (
      SELECT 1 FROM "Task" t
      WHERE t."dayId" = d."id" AND t."done"
        AND t."type" IN ('ROTINA_NORMAL', 'ROTINA_FAXINA')
    )
  );
