import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { CollectionHeader } from "@/components/modules/loja/CollectionHeader";
import { CollectionProductsSection } from "@/components/modules/loja/CollectionProductsSection";
import { CollectionTasksSection } from "@/components/modules/loja/CollectionTasksSection";
import { orderStatusLabels } from "@/lib/labels";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { orderStatusColors } from "@/lib/loja";
import { getUserSettings } from "@/lib/settings";
import {
  buildCostBreakdown,
  costItemsQuery,
  effectivePrice,
  formatMinutes,
  marginTone,
  totalCostAt,
} from "@/lib/produtos";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id: businessId, collectionId } = await params;

  const [collection, settings] = await Promise.all([
    prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        products: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { product: { include: { costItems: costItemsQuery } } },
        },
        orders: { orderBy: { orderDate: "desc" } },
        tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      },
    }),
    getUserSettings(),
  ]);
  if (!collection || collection.businessId !== businessId) notFound();

  // O catálogo do seletor: os ativos que este negócio pode usar, mais os que já
  // estão na coleção — um produto desativado depois não pode sumir da tela e
  // deixar a peça sem base para calcular custo.
  const catalog = await prisma.product.findMany({
    where: {
      OR: [
        { active: true, businessId },
        { active: true, businessId: null },
        { id: { in: collection.products.map((item) => item.productId) } },
      ],
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { costItems: costItemsQuery },
  });

  const ordersTotal = collection.orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Quanto a coleção custa e quanto ela rende se cada peça vender uma unidade.
  const totals = collection.products.reduce(
    (acc, item) => {
      const breakdown = buildCostBreakdown(item.product.costItems, {
        hourlyRate: settings.hourlyRate,
        extra: item.extraCost ?? 0,
      });
      const price = effectivePrice(item.price, item.product.basePrice);
      acc.minutes += breakdown.minutes;
      acc.cost += totalCostAt(breakdown, price);
      acc.revenue += price ?? 0;
      if (price === null) acc.semPreco += 1;
      if (item.product.costItems.length === 0) acc.semCusto += 1;
      return acc;
    },
    { cost: 0, revenue: 0, minutes: 0, semPreco: 0, semCusto: 0 },
  );

  const lucro = totals.revenue - totals.cost;
  const margemMedia = totals.revenue > 0 ? (lucro / totals.revenue) * 100 : null;

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Produtos" value={collection.products.length} />
          <StatCard label="Custo da coleção" value={formatCurrencyBRL(totals.cost)} />
          <StatCard
            label="Se vender uma de cada"
            value={formatCurrencyBRL(totals.revenue)}
          />
          <StatCard
            label="Lucro · margem"
            value={
              margemMedia === null
                ? "—"
                : `${formatCurrencyBRL(lucro)} · ${margemMedia.toFixed(0)}%`
            }
            valueClassName={cn("text-lg", marginTone(margemMedia, settings.targetMargin))}
          />
        </div>

        {(totals.semPreco > 0 || totals.semCusto > 0 || totals.minutes > 0) && (
          <p className="text-xs text-text-secondary">
            {totals.minutes > 0 && (
              <>Produzir uma de cada leva {formatMinutes(totals.minutes)}. </>
            )}
            {totals.semCusto > 0 && (
              <>
                {totals.semCusto === 1
                  ? "1 produto está sem custo cadastrado"
                  : `${totals.semCusto} produtos estão sem custo cadastrado`}{" "}
                na central, então a margem acima está otimista.{" "}
              </>
            )}
            {totals.semPreco > 0 && (
              <>
                {totals.semPreco === 1
                  ? "1 peça está sem preço"
                  : `${totals.semPreco} peças estão sem preço`}{" "}
                e não entra no faturamento.
              </>
            )}
          </p>
        )}

        <CollectionProductsSection
          collectionId={collection.id}
          hourlyRate={settings.hourlyRate}
          defaultTargetMargin={settings.targetMargin}
          catalog={catalog.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            imageUrl: p.imageUrl,
            basePrice: p.basePrice,
            targetMargin: p.targetMargin,
            costItems: p.costItems,
          }))}
          items={collection.products.map((p) => ({
            id: p.id,
            productId: p.productId,
            name: p.name,
            description: p.description,
            price: p.price,
            extraCost: p.extraCost,
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
            <CardTitle>
              Pedidos da coleção
              {collection.orders.length > 0 && (
                <span className="ml-2 font-normal text-text-secondary">
                  {collection.orders.length} · {formatCurrencyBRL(ordersTotal)}
                </span>
              )}
            </CardTitle>
            <Link
              href={`/negocios/${businessId}/pedidos`}
              className="-my-2 py-2 text-xs font-medium text-accent"
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
