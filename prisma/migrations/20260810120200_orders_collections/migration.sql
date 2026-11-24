-- Pedidos e coleções — os dois módulos da loja (Creative).

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDENTE',
  'EM_PRODUCAO',
  'PRONTO',
  'ENVIADO',
  'ENTREGUE',
  'CANCELADO'
);

CREATE TYPE "CollectionStatus" AS ENUM (
  'IDEIA',
  'EM_DESENVOLVIMENTO',
  'PRONTA',
  'LANCADA',
  'ENCERRADA'
);

CREATE TABLE "Collection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "season" TEXT,
  "status" "CollectionStatus" NOT NULL DEFAULT 'IDEIA',
  "launchDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "businessId" TEXT NOT NULL,

  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionProduct" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION,
  "cost" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "collectionId" TEXT NOT NULL,

  CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT,
  "customerName" TEXT NOT NULL,
  "customerContact" TEXT,
  "items" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDENTE',
  "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "businessId" TEXT NOT NULL,
  "collectionId" TEXT,

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Collection_businessId_status_idx" ON "Collection"("businessId", "status");
CREATE INDEX "CollectionProduct_collectionId_idx" ON "CollectionProduct"("collectionId");
CREATE INDEX "Order_businessId_status_idx" ON "Order"("businessId", "status");
CREATE INDEX "Order_businessId_dueDate_idx" ON "Order"("businessId", "dueDate");
CREATE INDEX "Order_collectionId_idx" ON "Order"("collectionId");

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Apagar uma coleção não apaga os pedidos dela: o pedido continua valendo,
-- só perde o vínculo com a coleção.
ALTER TABLE "Order" ADD CONSTRAINT "Order_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
