-- PEDIDOS COM ITENS DO CATÁLOGO
--
-- O pedido guardava os itens como texto livre e o total digitado à mão: dava
-- para escrever "2 canecas" e R$80 sem que nada checasse a conta, e não existia
-- custo nenhum — o app sabia quanto entrou, nunca quanto sobrou.
--
-- Agora cada linha é um OrderItem, com preço E custo copiados no dia do pedido.
-- Congelar é o ponto: reajustar a caneca em janeiro não pode reescrever o lucro
-- de um pedido de dezembro que já foi pago.
--
-- `Order.items` (texto) sai e `totalCost` entra. A tabela está vazia, então
-- nenhum pedido é perdido nessa troca.

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "collectionProductId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_collectionProductId_idx" ON "OrderItem"("collectionProductId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull nos dois: apagar um produto do catálogo não pode apagar a linha de um
-- pedido antigo. O nome congelado mantém o pedido legível sem a origem.
-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collectionProductId_fkey" FOREIGN KEY ("collectionProductId") REFERENCES "CollectionProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ALTER COLUMN "totalAmount" SET DEFAULT 0;
ALTER TABLE "Order" DROP COLUMN "items";
