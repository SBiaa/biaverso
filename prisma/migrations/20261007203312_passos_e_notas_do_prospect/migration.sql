-- CreateTable
CREATE TABLE "ProspectTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "key" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "estimateMinutes" INTEGER,
    "priorityLevelId" TEXT,
    "clientBusinessId" TEXT NOT NULL,

    CONSTRAINT "ProspectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectNote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientBusinessId" TEXT NOT NULL,

    CONSTRAINT "ProspectNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProspectTask_clientBusinessId_order_idx" ON "ProspectTask"("clientBusinessId", "order");

-- CreateIndex
CREATE INDEX "ProspectTask_priorityLevelId_idx" ON "ProspectTask"("priorityLevelId");

-- CreateIndex
CREATE INDEX "ProspectTask_dueDate_done_idx" ON "ProspectTask"("dueDate", "done");

-- CreateIndex
CREATE INDEX "ProspectNote_clientBusinessId_createdAt_idx" ON "ProspectNote"("clientBusinessId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProspectTask" ADD CONSTRAINT "ProspectTask_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectTask" ADD CONSTRAINT "ProspectTask_clientBusinessId_fkey" FOREIGN KEY ("clientBusinessId") REFERENCES "ClientBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectNote" ADD CONSTRAINT "ProspectNote_clientBusinessId_fkey" FOREIGN KEY ("clientBusinessId") REFERENCES "ClientBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
