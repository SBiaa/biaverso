-- ROTINA MARCADA PASSO A PASSO
--
-- Até aqui a rotina de autocuidado era tudo ou nada: um check para "fiz a
-- rotina da manhã", e os passos logo abaixo eram só uma lista numerada para
-- ler. Só que a manhã não é assim — lava o rosto, passa o tônico, e o sérum
-- fica para depois do café. Sem onde marcar isso, o meio do caminho não
-- existia e ela precisava lembrar de cabeça onde tinha parado.
--
-- CareRoutineStepLog guarda cada passo marcado numa data, do mesmo jeito que
-- CareRoutineLog guarda a rotina inteira. Os dois convivem: o log da rotina
-- continua sendo a verdade de "fiz tudo", e passa a ser derivado dos passos
-- quando existe passo cadastrado.
--
-- `routineChecklist` decide como os passos aparecem — um a um para marcar, ou
-- a lista numerada de antes, para quem prefere só conferir.

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "routineChecklist" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CareRoutineStepLog" (
    "id" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL,
    "stepId" TEXT NOT NULL,

    CONSTRAINT "CareRoutineStepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareRoutineStepLog_date_idx" ON "CareRoutineStepLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CareRoutineStepLog_stepId_date_key" ON "CareRoutineStepLog"("stepId", "date");

-- AddForeignKey
ALTER TABLE "CareRoutineStepLog" ADD CONSTRAINT "CareRoutineStepLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CareRoutineStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
