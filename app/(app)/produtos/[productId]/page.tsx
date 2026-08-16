import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle } from "@/components/ui";
import { ProductHeader } from "@/components/modules/produtos/ProductHeader";
import { ProductCostEditor } from "@/components/modules/produtos/ProductCostEditor";
import { ProductPricingPanel } from "@/components/modules/produtos/ProductPricingPanel";
import { getUserSettings } from "@/lib/settings";
import { costItemsQuery, effectivePrice } from "@/lib/produtos";
import { formatCurrencyBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProdutoDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const [product, businesses, categoryRows, settings, materials] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        business: { select: { name: true } },
        costItems: costItemsQuery,
        collectionItems: {
          orderBy: { createdAt: "desc" },
          include: {
            collection: { select: { id: true, name: true, businessId: true } },
          },
        },
      },
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    getUserSettings(),
    prisma.material.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  // Vendas de verdade, dos preços congelados nos pedidos — não do preço de
  // hoje. Pedido cancelado fica de fora: não foi venda.
  const sold = await prisma.orderItem.findMany({
    where: { productId, order: { status: { not: "CANCELADO" } } },
    select: { quantity: true, unitPrice: true, unitCost: true },
  });
  const sales = sold.reduce(
    (acc, item) => {
      acc.units += item.quantity;
      acc.revenue += item.quantity * item.unitPrice;
      acc.profit += item.quantity * (item.unitPrice - item.unitCost);
      return acc;
    },
    { units: 0, revenue: 0, profit: 0 },
  );

  const categories = categoryRows
    .map((row) => row.category)
    .filter((c): c is string => !!c);

  return (
    <>
      <Topbar title={product.name} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Link
          href="/produtos"
          className="text-xs font-medium text-text-secondary hover:text-accent"
        >
          ← Central de produtos
        </Link>

        <ProductHeader
          businesses={businesses}
          categories={categories}
          businessName={product.business?.name ?? null}
          product={{
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            basePrice: product.basePrice,
            targetMargin: product.targetMargin,
            active: product.active,
            notes: product.notes,
            businessId: product.businessId,
          }}
        />

        <ProductPricingPanel
          productId={product.id}
          costItems={product.costItems}
          basePrice={product.basePrice}
          targetMargin={product.targetMargin ?? settings.targetMargin}
          hourlyRate={settings.hourlyRate}
        />

        <ProductCostEditor
          productId={product.id}
          items={product.costItems}
          hourlyRate={settings.hourlyRate}
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            packPrice: m.packPrice,
            packQuantity: m.packQuantity,
          }))}
        />

        {sales.units > 0 && (
          <Card className="flex flex-col gap-2">
            <CardTitle>Vendas</CardTitle>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-text-secondary">Unidades vendidas</p>
                <p className="text-lg font-semibold text-text-primary">{sales.units}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Faturamento</p>
                <p className="text-lg font-semibold text-text-primary">
                  {formatCurrencyBRL(sales.revenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Lucro</p>
                <p className="text-lg font-semibold text-text-primary">
                  {formatCurrencyBRL(sales.profit)}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-secondary">
              Pelos preços congelados em cada pedido, não pelo preço de hoje.
            </p>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <CardTitle>Onde este produto está</CardTitle>
          {product.collectionItems.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Ainda não está em nenhuma coleção. Abra uma coleção e escolha este
              produto para dar a arte e o preço da temporada.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {product.collectionItems.map((item) => {
                const price = effectivePrice(item.price, product.basePrice);
                return (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/negocios/${item.collection.businessId}/colecoes/${item.collection.id}`}
                      className="min-w-0 hover:text-accent"
                    >
                      <span className="text-text-primary">{item.name ?? product.name}</span>
                      <span className="text-text-secondary"> · {item.collection.name}</span>
                    </Link>
                    <span className="shrink-0 text-text-primary">
                      {price === null ? "—" : formatCurrencyBRL(price)}
                      {item.price === null && price !== null && (
                        <span className="text-xs text-text-secondary"> (da base)</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
