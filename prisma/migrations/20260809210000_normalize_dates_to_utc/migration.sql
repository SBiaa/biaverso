-- Normaliza as datas-calendário gravadas com meia-noite LOCAL para meia-noite UTC.
--
-- Antes, `startOfToday()`/`getWeekStart()` gravavam 00:00 no fuso do servidor
-- (03:00Z em America/Sao_Paulo), enquanto os <input type="date"> gravavam 00:00Z.
-- Isso fazia filtro e formatação errarem por um dia. Agora tudo é 00:00Z.
--
-- A conversão lê o valor cru como UTC, leva para o fuso do app, corta no dia e
-- regrava — então é correta mesmo para registros criados em horário de verão.
-- Valores que já estavam em 00:00Z passam sem alteração.

-- Day.date é UNIQUE: se dois registros colapsarem no mesmo dia (banco escrito por
-- servidores em fusos diferentes), o UPDATE falha e a migration inteira é revertida.
-- Nesse caso, resolva os duplicados manualmente antes de rodar de novo.
UPDATE "Day"
SET "date" = date_trunc('day', ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo');

UPDATE "MealPlan"
SET "weekStart" = date_trunc('day', ("weekStart" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo');

UPDATE "WeekReview"
SET "weekStart" = date_trunc('day', ("weekStart" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'),
    "weekEnd"   = date_trunc('day', ("weekEnd"   AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo');

-- Task.dueDate: só as tarefas de rotina materializadas herdavam Day.date (local).
-- As criadas por <input type="date"> já estavam em 00:00Z e passam intactas.
UPDATE "Task"
SET "dueDate" = date_trunc('day', ("dueDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
WHERE "dueDate" IS NOT NULL;
