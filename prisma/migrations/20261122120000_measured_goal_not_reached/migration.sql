-- Meta que chegou ao prazo sem ser batida ganha status próprio, em vez de
-- ficar como "Cancelado" (que significa desistência). E um campo para
-- registrar o aprendizado ao encerrar.

ALTER TYPE "MeasuredGoalStatus" ADD VALUE 'NAO_ATINGIDO';

ALTER TABLE "MeasuredGoal" ADD COLUMN "lesson" TEXT;
