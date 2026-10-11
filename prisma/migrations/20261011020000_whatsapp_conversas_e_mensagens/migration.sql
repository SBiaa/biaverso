-- Leitor de WhatsApp: conversas e mensagens recebidas pelo robô (só leitura).
-- Tabelas novas; a única mudança em tabela existente é o vínculo opcional
-- WhatsappChat -> Client, que mora na própria tabela nova.

-- CreateTable
CREATE TABLE "WhatsappChat" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "awaitingSince" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "lastIncomingAt" TIMESTAMP(3),
    "lastOutgoingAt" TIMESTAMP(3),
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "senderName" TEXT,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappChat_jid_key" ON "WhatsappChat"("jid");

-- CreateIndex
CREATE INDEX "WhatsappChat_ignored_awaitingSince_idx" ON "WhatsappChat"("ignored", "awaitingSince");

-- CreateIndex
CREATE INDEX "WhatsappChat_lastMessageAt_idx" ON "WhatsappChat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "WhatsappChat_clientId_idx" ON "WhatsappChat"("clientId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_chatId_sentAt_idx" ON "WhatsappMessage"("chatId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsappMessage_sentAt_idx" ON "WhatsappMessage"("sentAt");

-- CreateIndex
CREATE INDEX "WhatsappMessage_important_sentAt_idx" ON "WhatsappMessage"("important", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMessage_chatId_waId_key" ON "WhatsappMessage"("chatId", "waId");

-- AddForeignKey
ALTER TABLE "WhatsappChat" ADD CONSTRAINT "WhatsappChat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "WhatsappChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
