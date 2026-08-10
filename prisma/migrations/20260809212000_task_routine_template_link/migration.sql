-- Liga a tarefa de rotina copiada para um dia ao template que a gerou.
--
-- Antes a correspondência era feita pelo título: renomear "Lavar louça" para
-- "Lavar a louça" fazia o app não reconhecer a cópia já existente e criar uma
-- segunda tarefa em todo dia materializado.

ALTER TABLE "Task" ADD COLUMN "templateId" TEXT;

CREATE INDEX "Task_templateId_idx" ON "Task"("templateId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: casa as cópias já existentes com o template de mesmo título e tipo,
-- para que a primeira renomeação depois desta migration não duplique nada.
-- Se dois templates tiverem o mesmo título, nenhum dos dois é usado (a escolha
-- seria arbitrária) e a cópia continua sendo reconhecida pelo título.
UPDATE "Task" copia
SET "templateId" = template."id"
FROM (
  SELECT "id", "title", "type"
  FROM "Task"
  WHERE "dayId" IS NULL
    AND "type" IN ('ROTINA_NORMAL', 'ROTINA_FAXINA')
    AND "title" IN (
      SELECT "title" FROM "Task"
      WHERE "dayId" IS NULL AND "type" IN ('ROTINA_NORMAL', 'ROTINA_FAXINA')
      GROUP BY "title", "type" HAVING count(*) = 1
    )
) template
WHERE copia."dayId" IS NOT NULL
  AND copia."templateId" IS NULL
  AND copia."title" = template."title"
  AND copia."type" = template."type";
