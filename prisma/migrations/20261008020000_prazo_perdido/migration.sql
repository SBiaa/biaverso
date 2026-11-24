-- Tarefa de produção com mais de uma semana de atraso ganha o estado próprio
-- "prazo perdido", gravado pelo sistema.
ALTER TYPE "ProductionStatus" ADD VALUE 'PRAZO_PERDIDO';
