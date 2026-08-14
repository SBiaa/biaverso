import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { OrdersBoard, type OrderCard } from "@/components/modules/loja/OrdersBoard";
import type { OrderPickOption } from "@/components/modules/loja/OrderItemsEditor";
import { buildBusinessTabs } from "@/lib/business-modules";
import { isOrderOverdue } from "@/lib/loja";
import { costItemsQuery, effectivePrice } from "@/lib/produtos";
import { getUserSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function BusinessOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!business) notFound();

  // Módulo desligado não tem aba: chegar aqui pela URL é o mesmo que não existir.
  const tabs = buildBusinessTabs(id, business.modules);
  if (!tabs.some((t) => t.key === "pedidos")) notFound();

  const [orders, collections, pieces, catalog, settings] = await Promise.all([
    prisma.order.findMany({
      where: { businessId: id },
      include: {
        collection: { select: { name: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ dueDate: "asc" }, { orderDate: "desc" }],
    }),
    prisma.collection.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    // As peças das coleções deste negócio: é delas que a maioria dos pedidos
    // fala, e elas já carregam o preço da temporada.
    prisma.collectionProduct.findMany({
      where: { collection: { businessId: id } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        collection: { select: { id: true, name: true } },
        product: { include: { costItems: costItemsQuery } },
      },
    }),
    prisma.product.findMany({
      where: {
        active: true,
        OR: [{ businessId: id }, { businessId: null }],
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { costItems: costItemsQuery },
    }),
    getUserSettings(),
  ]);

  const pickOptions: OrderPickOption[] = [
    ...pieces.map((piece) => ({
      key: `piece-${piece.id}`,
      label: piece.name ?? piece.product.name,
      sublabel: `${piece.collection.name} · ${piece.product.name}`,
      unitPrice: effectivePrice(piece.price, piece.product.basePrice),
      costItems: piece.product.costItems,
      extraCost: piece.extraCost ?? 0,
      productId: piece.productId,
      collectionProductId: piece.id,
      collectionId: piece.collection.id,
    })),
    ...catalog.map((product) => ({
      key: `product-${product.id}`,
      label: product.name,
      sublabel: product.category ?? "Catálogo",
      unitPrice: product.basePrice,
      costItems: product.costItems,
      extraCost: 0,
      productId: product.id,
      collectionProductId: null,
      collectionId: null,
    })),
  ];

  const cards: OrderCard[] = orders.map((order) => ({
    collectionName: order.collection?.name ?? null,
    overdue: isOrderOverdue(order),
    record: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerContact: order.customerContact,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        productId: item.productId,
        collectionProductId: item.collectionProductId,
      })),
      totalAmount: order.totalAmount,
      totalCost: order.totalCost,
      status: order.status,
      orderDate: order.orderDate.toISOString(),
      dueDate: order.dueDate ? order.dueDate.toISOString() : null,
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
      notes: order.notes,
      collectionId: order.collectionId,
    },
  }));

  return (
    <>
      <Topbar title={business.name} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BusinessTabs businessId={id} tabs={tabs} active="pedidos" />
        <OrdersBoard
          businessId={id}
          collections={collections}
          orders={cards}
          pickOptions={pickOptions}
          hourlyRate={settings.hourlyRate}
          targetMargin={settings.targetMargin}
        />
      </main>
    </>
  );
}
