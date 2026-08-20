-- Espiritual — a vida de bruxa: encontros do coven e com a mestre, os textos e
-- exercicios que vem deles (com prazo de entrega), o diario de rituais, as
-- tiragens e o inventario do altar.
--
-- A Roda do Ano e as fases da lua nao tem tabela: sao conta, e ficam em
-- lib/astros.ts. Gravar a data de um sabbath seria guardar algo que o app sabe
-- deduzir — e que uma tabela chumbada erraria alguns anos depois.
--
-- ESPIRITUAL entra no EventCategory porque o encontro do coven vira Evento na
-- Agenda: e assim que ele chega ao Google Calendar, sem o modulo precisar
-- conhecer o Google.

-- CreateEnum
CREATE TYPE "CovenMeetingKind" AS ENUM ('COVEN', 'MESTRE', 'RITUAL_COLETIVO', 'AULA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StudyKind" AS ENUM ('TEXTO', 'EXERCICIO', 'LEITURA', 'PRATICA', 'PESQUISA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'FEITO', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "RitualKind" AS ENUM ('RITUAL', 'FEITICO', 'MEDITACAO', 'OFERENDA', 'BANHO', 'SABBAT', 'ESBAT', 'OUTRO');

-- CreateEnum
CREATE TYPE "DivinationMethod" AS ENUM ('TAROT', 'ORACULO', 'RUNAS', 'PENDULO', 'BUZIOS', 'OUTRO');

-- CreateEnum
CREATE TYPE "AltarCategory" AS ENUM ('ERVA', 'CRISTAL', 'VELA', 'INCENSO', 'OLEO', 'FERRAMENTA', 'BARALHO', 'IMAGEM', 'OUTRO');

-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'ESPIRITUAL' BEFORE 'OUTRO';

-- CreateTable
CREATE TABLE "CovenMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "CovenMeetingKind" NOT NULL DEFAULT 'COVEN',
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "endTime" TEXT,
    "place" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "attended" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT,

    CONSTRAINT "CovenMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpiritualStudy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "StudyKind" NOT NULL DEFAULT 'TEXTO',
    "status" "StudyStatus" NOT NULL DEFAULT 'A_FAZER',
    "receivedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "content" TEXT,
    "notes" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingId" TEXT,

    CONSTRAINT "SpiritualStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RitualLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" "RitualKind" NOT NULL DEFAULT 'RITUAL',
    "intention" TEXT,
    "elements" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RitualLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Divination" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "method" "DivinationMethod" NOT NULL DEFAULT 'TAROT',
    "deck" TEXT,
    "question" TEXT,
    "spread" TEXT,
    "cards" TEXT[],
    "reading" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Divination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltarItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AltarCategory" NOT NULL DEFAULT 'ERVA',
    "quantity" TEXT,
    "runningLow" BOOLEAN NOT NULL DEFAULT false,
    "properties" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AltarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CovenMeeting_eventId_key" ON "CovenMeeting"("eventId");

-- CreateIndex
CREATE INDEX "CovenMeeting_date_idx" ON "CovenMeeting"("date");

-- CreateIndex
CREATE INDEX "SpiritualStudy_status_dueDate_idx" ON "SpiritualStudy"("status", "dueDate");

-- CreateIndex
CREATE INDEX "SpiritualStudy_meetingId_idx" ON "SpiritualStudy"("meetingId");

-- CreateIndex
CREATE INDEX "RitualLog_date_idx" ON "RitualLog"("date");

-- CreateIndex
CREATE INDEX "Divination_date_idx" ON "Divination"("date");

-- CreateIndex
CREATE INDEX "AltarItem_category_name_idx" ON "AltarItem"("category", "name");

-- CreateIndex
CREATE INDEX "AltarItem_runningLow_idx" ON "AltarItem"("runningLow");

-- AddForeignKey
ALTER TABLE "CovenMeeting" ADD CONSTRAINT "CovenMeeting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpiritualStudy" ADD CONSTRAINT "SpiritualStudy_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CovenMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
