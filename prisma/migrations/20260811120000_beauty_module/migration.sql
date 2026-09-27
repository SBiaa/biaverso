-- Beleza e autocuidado — rotinas diárias, cronogramas cíclicos, cuidados
-- agendados e o inventário de produtos que abastece os três.

ALTER TYPE "TransactionCategory" ADD VALUE 'BELEZA' BEFORE 'OUTRO';

CREATE TYPE "RoutineTime" AS ENUM (
  'MANHA',
  'NOITE',
  'QUALQUER'
);

CREATE TYPE "CareType" AS ENUM (
  'UNHAS',
  'CABELO',
  'DEPILACAO',
  'SOBRANCELHA',
  'ESTETICA',
  'MASSAGEM',
  'OUTRO'
);

CREATE TYPE "ProductCategory" AS ENUM (
  'SKINCARE_LIMPEZA',
  'SKINCARE_TRATAMENTO',
  'SKINCARE_HIDRATACAO',
  'SKINCARE_PROTECAO',
  'CABELO_SHAMPOO',
  'CABELO_CONDICIONADOR',
  'CABELO_MASCARA',
  'CABELO_FINALIZADOR',
  'CORPO',
  'MAQUIAGEM',
  'UNHAS',
  'OUTRO'
);

CREATE TABLE "BeautyProduct" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "category" "ProductCategory" NOT NULL,
  "openedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "pao" INTEGER,
  "finished" BOOLEAN NOT NULL DEFAULT false,
  "finishedAt" TIMESTAMP(3),
  "cost" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BeautyProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareRoutine" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timeOfDay" "RoutineTime" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareRoutine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareRoutineStep" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "routineId" TEXT NOT NULL,
  "productId" TEXT,

  CONSTRAINT "CareRoutineStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareRoutineLog" (
  "id" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "date" TIMESTAMP(3) NOT NULL,
  "routineId" TEXT NOT NULL,

  CONSTRAINT "CareRoutineLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareSchedule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareScheduleStep" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "intervalDays" INTEGER NOT NULL DEFAULT 7,
  "scheduleId" TEXT NOT NULL,
  "productId" TEXT,

  CONSTRAINT "CareScheduleStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareScheduleLog" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduleId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,

  CONSTRAINT "CareScheduleLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareAppointment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CareType" NOT NULL,
  "intervalDays" INTEGER NOT NULL,
  "lastDoneAt" TIMESTAMP(3),
  "nextDueAt" TIMESTAMP(3),
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareAppointmentLog" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "cost" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appointmentId" TEXT NOT NULL,

  CONSTRAINT "CareAppointmentLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BeautyProduct_finished_category_idx" ON "BeautyProduct"("finished", "category");
CREATE INDEX "BeautyProduct_expiresAt_idx" ON "BeautyProduct"("expiresAt");

CREATE INDEX "CareRoutine_active_order_idx" ON "CareRoutine"("active", "order");

CREATE INDEX "CareRoutineStep_routineId_order_idx" ON "CareRoutineStep"("routineId", "order");
CREATE INDEX "CareRoutineStep_productId_idx" ON "CareRoutineStep"("productId");

CREATE UNIQUE INDEX "CareRoutineLog_routineId_date_key" ON "CareRoutineLog"("routineId", "date");
CREATE INDEX "CareRoutineLog_date_idx" ON "CareRoutineLog"("date");

CREATE INDEX "CareSchedule_active_idx" ON "CareSchedule"("active");

CREATE INDEX "CareScheduleStep_scheduleId_order_idx" ON "CareScheduleStep"("scheduleId", "order");
CREATE INDEX "CareScheduleStep_productId_idx" ON "CareScheduleStep"("productId");

CREATE INDEX "CareScheduleLog_scheduleId_date_idx" ON "CareScheduleLog"("scheduleId", "date");
CREATE INDEX "CareScheduleLog_stepId_idx" ON "CareScheduleLog"("stepId");

CREATE INDEX "CareAppointment_active_nextDueAt_idx" ON "CareAppointment"("active", "nextDueAt");

CREATE INDEX "CareAppointmentLog_appointmentId_date_idx" ON "CareAppointmentLog"("appointmentId", "date");

ALTER TABLE "CareRoutineStep"
  ADD CONSTRAINT "CareRoutineStep_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "CareRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CareRoutineStep_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BeautyProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CareRoutineLog"
  ADD CONSTRAINT "CareRoutineLog_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "CareRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareScheduleStep"
  ADD CONSTRAINT "CareScheduleStep_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CareSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CareScheduleStep_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BeautyProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CareScheduleLog"
  ADD CONSTRAINT "CareScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CareSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CareScheduleLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CareScheduleStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareAppointmentLog"
  ADD CONSTRAINT "CareAppointmentLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "CareAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
