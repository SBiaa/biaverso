-- Estudos organizados em Área → Assunto → Curso → Aula.
-- Os materiais soltos (Knowledge) continuam como estão; ganham só um assunto opcional.

-- CreateTable
CREATE TABLE "StudyArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySubject" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "KnowledgeStudyStatus" NOT NULL DEFAULT 'QUERO_ESTUDAR',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyCourse" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructor" TEXT,
    "platform" TEXT,
    "link" TEXT,
    "notes" TEXT,
    "status" "KnowledgeStudyStatus" NOT NULL DEFAULT 'QUERO_ESTUDAR',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyLesson_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Knowledge" ADD COLUMN "subjectId" TEXT;

-- CreateIndex
CREATE INDEX "StudySubject_areaId_idx" ON "StudySubject"("areaId");

-- CreateIndex
CREATE INDEX "StudyCourse_subjectId_idx" ON "StudyCourse"("subjectId");

-- CreateIndex
CREATE INDEX "StudyLesson_courseId_idx" ON "StudyLesson"("courseId");

-- CreateIndex
CREATE INDEX "Knowledge_subjectId_idx" ON "Knowledge"("subjectId");

-- AddForeignKey
ALTER TABLE "StudySubject" ADD CONSTRAINT "StudySubject_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "StudyArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyCourse" ADD CONSTRAINT "StudyCourse_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyLesson" ADD CONSTRAINT "StudyLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "StudyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
