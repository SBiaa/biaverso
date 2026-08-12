import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { OrdersBoard, type OrderCard } from "@/components/modules/loja/OrdersBoard";
import { buildBusinessTabs } from "@/lib/business-modules";
import { isOrderOverdue } from "@/lib/loja";

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

  const [orders, collections] = await Promise.all([
    prisma.order.findMany({
      where: { businessId: id },
      include: { collection: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { orderDate: "desc" }],
    }),
    prisma.collection.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const cards: OrderCard[] = orders.map((order) => ({
    collectionName: order.collection?.name ?? null,
    overdue: isOrderOverdue(order),
    record: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerContact: order.customerContact,
      items: order.items,
      totalAmount: order.totalAmount,
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
        <OrdersBoard businessId={id} collections={collections} orders={cards} />
      </main>
    </>
  );
}
