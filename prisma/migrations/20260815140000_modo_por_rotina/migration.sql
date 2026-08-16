-- CHECKLIST OU LISTA, POR ROTINA
--
-- A preferência tinha nascido em UserSettings, valendo para todas as rotinas
-- de uma vez. Mas as rotinas não se parecem: a do banho é para ir marcando
-- enquanto acontece, e uma de maquiagem pode ser só a ordem certa para
-- consultar. Uma chave global obrigava as duas a serem a mesma coisa.
--
-- Agora cada rotina carrega o seu modo, escolhido junto com nome e período.
-- A coluna de UserSettings sai porque nasceu nesta mesma leva e nunca chegou a
-- guardar preferência de verdade.

-- AlterTable
ALTER TABLE "CareRoutine" ADD COLUMN     "checklist" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "routineChecklist";
