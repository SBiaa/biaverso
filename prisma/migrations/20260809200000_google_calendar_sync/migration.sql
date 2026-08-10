-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDENTE', 'SINCRONIZADO', 'ERRO');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('APP_TO_GOOGLE', 'GOOGLE_TO_APP', 'BIDIRECIONAL');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "GoogleAuth" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "eventsFrom" INTEGER NOT NULL DEFAULT 0,
    "eventsTo" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_googleEventId_key" ON "Event"("googleEventId");

-- CreateIndex
CREATE INDEX "Event_syncStatus_idx" ON "Event"("syncStatus");

-- CreateIndex
CREATE INDEX "SyncLog_syncedAt_idx" ON "SyncLog"("syncedAt");
