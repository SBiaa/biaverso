-- Etapas (gravar, editar, design, legenda...) passam a morar dentro do próprio
-- post do cronograma, em vez de uma tarefa de produção separada.
ALTER TABLE "Subtask" ADD COLUMN "contentPostId" TEXT;

CREATE INDEX "Subtask_contentPostId_order_idx" ON "Subtask"("contentPostId", "order");

ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_contentPostId_fkey"
  FOREIGN KEY ("contentPostId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
