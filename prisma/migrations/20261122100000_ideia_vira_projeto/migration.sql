-- "Virou projeto" passa a ligar de verdade a ideia ao projeto criado a partir dela.
ALTER TABLE "Idea" ADD COLUMN "projectId" TEXT;

CREATE UNIQUE INDEX "Idea_projectId_key" ON "Idea"("projectId");

ALTER TABLE "Idea" ADD CONSTRAINT "Idea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
