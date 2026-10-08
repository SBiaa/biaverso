-- Post com mais de uma semana de atraso também ganha o estado "prazo perdido".
ALTER TYPE "ContentStatus" ADD VALUE 'PRAZO_PERDIDO';
