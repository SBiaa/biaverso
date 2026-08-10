-- Normaliza as datas-calendário gravadas com meia-noite LOCAL para meia-noite UTC.
--
-- O código antigo (`startOfToday()`, `getWeekStart()`) gravava 00:00 no fuso do
-- servidor — 03:00Z em America/Sao_Paulo — enquanto os <input type="date">
-- gravavam 00:00Z. As duas convenções conviviam e faziam filtro e formatação
-- errarem por um dia. Agora tudo é 00:00Z.
--
-- IMPORTANTE: a conversão só pode tocar em quem tem hora diferente de 00:00.
-- Aplicá-la a um valor já normalizado jogaria o registro um dia para trás
-- (00:00Z → 21:00 do dia anterior em SP → trunca no dia anterior). Por isso todo
-- UPDATE aqui tem o filtro `<> date_trunc('day', ...)`.

-- ------------------------------------------------------- Day duplicado
-- Enquanto as duas convenções conviveram, o mesmo dia pôde ser gravado duas
-- vezes: uma em 03:00Z (código antigo) e outra em 00:00Z (código novo). Depois
-- da normalização os dois colidiriam no UNIQUE de Day.date, então a casca vazia
-- precisa sair antes.
--
-- "Casca" = nenhum dado que a usuária tenha preenchido: sem humor, energia ou
-- notas; sem água, refeição, hábito marcado, tarefa concluída, tarefa avulsa ou
-- evento. Só sobram as tarefas de rotina auto-materializadas ao abrir a página.
CREATE TEMP TABLE dias_normalizados ON COMMIT DROP AS
SELECT
  d.id,
  date_trunc(
    'day',
    CASE
      WHEN d."date" = date_trunc('day', d."date") THEN d."date"
      ELSE (d."date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
    END
  ) AS dia,
  (
    d.mood IS NOT NULL
    OR d.energy IS NOT NULL
    OR coalesce(d.notes, '') <> ''
    OR EXISTS (SELECT 1 FROM "WaterLog" w WHERE w."dayId" = d.id)
    OR EXISTS (SELECT 1 FROM "MealLog" m WHERE m."dayId" = d.id)
    OR EXISTS (SELECT 1 FROM "HabitLog" h WHERE h."dayId" = d.id AND h.done)
    OR EXISTS (SELECT 1 FROM "Task" t WHERE t."dayId" = d.id AND (t.done OR t.type = 'AVULSA'))
    OR EXISTS (SELECT 1 FROM "Event" e WHERE e."dayId" = d.id)
  ) AS tem_conteudo
FROM "Day" d;

-- Se os dois lados de uma duplicata tiverem conteúdo, escolher um seria perder
-- dado seu. Nesse caso a migration para e você decide.
DO $$
DECLARE conflitos int;
BEGIN
  SELECT count(*) INTO conflitos FROM (
    SELECT dia FROM dias_normalizados WHERE tem_conteudo GROUP BY dia HAVING count(*) > 1
  ) x;
  IF conflitos > 0 THEN
    RAISE EXCEPTION
      'Há % dia(s) duplicados em que os dois registros têm dados preenchidos. Junte-os à mão antes de rodar esta migration.', conflitos;
  END IF;
END $$;

CREATE TEMP TABLE cascas ON COMMIT DROP AS
SELECT n.id
FROM dias_normalizados n
WHERE NOT n.tem_conteudo
  AND EXISTS (SELECT 1 FROM dias_normalizados o WHERE o.dia = n.dia AND o.id <> n.id);

-- Os filhos são apagados na mão: o ON DELETE CASCADE só entra na migration seguinte.
DELETE FROM "HabitLog" WHERE "dayId" IN (SELECT id FROM cascas);
DELETE FROM "WaterLog" WHERE "dayId" IN (SELECT id FROM cascas);
DELETE FROM "MealLog"  WHERE "dayId" IN (SELECT id FROM cascas);
DELETE FROM "Task"     WHERE "dayId" IN (SELECT id FROM cascas);
DELETE FROM "Event"    WHERE "dayId" IN (SELECT id FROM cascas);
DELETE FROM "Day"      WHERE id      IN (SELECT id FROM cascas);

-- ------------------------------------------------------- normalização
UPDATE "Day"
SET "date" = date_trunc('day', ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "date" <> date_trunc('day', "date");

UPDATE "MealPlan"
SET "weekStart" = date_trunc('day', ("weekStart" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "weekStart" <> date_trunc('day', "weekStart");

UPDATE "WeekReview"
SET "weekStart" = date_trunc('day', ("weekStart" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "weekStart" <> date_trunc('day', "weekStart");

UPDATE "WeekReview"
SET "weekEnd" = date_trunc('day', ("weekEnd" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "weekEnd" <> date_trunc('day', "weekEnd");

-- Task.dueDate: só as tarefas de rotina materializadas herdavam Day.date (local).
-- As criadas por <input type="date"> já estavam em 00:00Z e o filtro as ignora.
UPDATE "Task"
SET "dueDate" = date_trunc('day', ("dueDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "dueDate" IS NOT NULL
  AND "dueDate" <> date_trunc('day', "dueDate");
