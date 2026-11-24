-- Detalhes do registro de tempo (descrição, projeto, tarefa, origem pomodoro) e
-- a configuração do pomodoro. Só colunas novas e vazias e uma tabela nova:
-- nada do que existe muda.

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "description" TEXT,
ADD COLUMN "projectId" TEXT,
ADD COLUMN "taskId" TEXT,
ADD COLUMN "pomodoro" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PomodoroSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "focusMinutes" INTEGER NOT NULL DEFAULT 25,
    "shortBreakMinutes" INTEGER NOT NULL DEFAULT 5,
    "longBreakMinutes" INTEGER NOT NULL DEFAULT 15,
    "cyclesBeforeLongBreak" INTEGER NOT NULL DEFAULT 4,
    "autoStartBreaks" BOOLEAN NOT NULL DEFAULT true,
    "autoStartFocus" BOOLEAN NOT NULL DEFAULT false,
    "sound" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
