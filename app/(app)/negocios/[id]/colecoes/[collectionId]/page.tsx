import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, StatCard } from "@/components/ui";
import { CollectionHeader } from "@/components/modules/loja/CollectionHeader";
import { CollectionProductsSection } from "@/components/modules/loja/CollectionProductsSection";
import { CollectionTasksSection } from "@/components/modules/loja/CollectionTasksSection";
import { orderStatusLabels } from "@/lib/labels";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { orderStatusColors } from "@/lib/loja";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id: businessId, collectionId } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      products: { orderBy: { createdAt: "asc" } },
      orders: { orderBy: { orderDate: "desc" } },
      tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!collection || collection.businessId !== businessId) notFound();

  const ordersTotal = collection.orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <>
      <Topbar title={collection.name} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Link
          href={`/negocios/${businessId}/colecoes`}
          className="text-xs font-medium text-text-secondary hover:text-accent"
        >
          ← Todas as coleções
        </Link>

        <CollectionHeader
          businessId={businessId}
          collection={{
            id: collection.id,
            name: collection.name,
            description: collection.description,
            season: collection.season,
            status: collection.status,
            launchDate: collection.launchDate ? collection.launchDate.toISOString() : null,
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Produtos" value={collection.products.length} />
          <StatCard label="Pedidos" value={collection.orders.length} />
          <StatCard label="Total em pedidos" value={formatCurrencyBRL(ordersTotal)} />
        </div>

        <CollectionProductsSection
          collectionId={collection.id}
          products={collection.products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            cost: p.cost,
            imageUrl: p.imageUrl,
            notes: p.notes,
          }))}
        />

        <CollectionTasksSection
          collectionId={collection.id}
          initialTasks={collection.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            done: t.done,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          }))}
        />

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Pedidos da coleção</h2>
            <Link
              href={`/negocios/${businessId}/pedidos`}
              className="text-xs font-medium text-accent"
            >
              Ver kanban
            </Link>
          </div>
          {collection.orders.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum pedido vinculado a esta coleção.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {collection.orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="text-text-primary">{order.customerName}</p>
                    <p className="text-xs text-text-secondary">
                      {formatDateBR(order.orderDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        orderStatusColors[order.status],
                      )}
                    >
                      {orderStatusLabels[order.status]}
                    </span>
                    <span className="font-medium text-text-primary">
                      {formatCurrencyBRL(order.totalAmount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
