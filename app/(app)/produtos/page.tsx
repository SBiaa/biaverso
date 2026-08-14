import Link from "next/link";
import { Package, AlertTriangle, Percent, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, StatCard } from "@/components/ui";
import { ProductCard } from "@/components/modules/produtos/ProductCard";
import { ProductFilters } from "@/components/modules/produtos/ProductFilters";
import { NewProductButton } from "@/components/modules/produtos/NewProductButton";
import { getUserSettings } from "@/lib/settings";
import { buildCostBreakdown, costItemsQuery, marginAt } from "@/lib/produtos";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  businessId?: string;
  category?: string;
  status?: string;
}>;

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.ProductWhereInput = {};
  // Produto sem negócio serve para todos, então entra em qualquer filtro —
  // filtrar por Creative não pode esconder a caneca que as três marcas usam.
  if (params.businessId) {
    where.OR = [{ businessId: params.businessId }, { businessId: null }];
  }
  if (params.category) where.category = params.category;
  if (params.status === "TODOS") {
    // sem filtro
  } else if (params.status === "INATIVOS") {
    where.active = false;
  } else {
    where.active = true;
  }

  const [products, businesses, categoryRows, settings, materialCount] =
    await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: {
          business: { select: { name: true } },
          costItems: costItemsQuery,
          _count: { select: { collectionItems: true } },
        },
      }),
      prisma.business.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      // As categorias existentes viram as opções do filtro e do datalist: assim a
      // lista se organiza sozinha, sem um enum para manter à mão.
      prisma.product.findMany({
        where: { category: { not: null } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      getUserSettings(),
      prisma.material.count(),
    ]);

  const categories = categoryRows
    .map((row) => row.category)
    .filter((c): c is string => !!c);

  const semCusto = products.filter((p) => p.costItems.length === 0).length;
  const emColecoes = products.reduce(
    (sum, p) => sum + p._count.collectionItems,
    0,
  );

  // Média só do que dá para calcular: produto sem preço ou sem custo não tem
  // margem, e contar como zero puxaria o número para baixo sem significar nada.
  const margins = products
    .map((p) =>
      marginAt(
        buildCostBreakdown(p.costItems, { hourlyRate: settings.hourlyRate }),
        p.basePrice,
      ),
    )
    .filter((m): m is number => m !== null);
  const margemMedia = margins.length
    ? margins.reduce((sum, m) => sum + m, 0) / margins.length
    : null;

  return (
    <>
      <Topbar title="Central de produtos" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Produtos"
            value={String(products.length)}
            icon={<Package size={16} className="text-accent" />}
          />
          <StatCard
            label="Sem custo cadastrado"
            value={String(semCusto)}
            icon={<AlertTriangle size={16} className="text-text-secondary" />}
            valueClassName={semCusto > 0 ? "text-amber-600" : undefined}
          />
          <StatCard
            label="Margem média"
            value={margemMedia === null ? "—" : `${margemMedia.toFixed(0)}%`}
            icon={<Percent size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Peças em coleções"
            value={String(emColecoes)}
            icon={<Layers size={16} className="text-text-secondary" />}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProductFilters businesses={businesses} categories={categories} />
          <div className="flex items-center gap-3">
            <Link
              href="/produtos/insumos"
              className="text-xs font-medium text-text-secondary hover:text-accent"
            >
              Insumos{materialCount > 0 && ` (${materialCount})`} →
            </Link>
            <NewProductButton businesses={businesses} categories={categories} />
          </div>
        </div>

        {products.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">
              Nenhum produto por aqui. Cadastre o item físico — &ldquo;Caneca
              325ml&rdquo;, &ldquo;Almofada 30x30&rdquo; — com tudo que ele
              custa para produzir. Depois é só escolher na coleção e dar a arte.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                hourlyRate={settings.hourlyRate}
                defaultTargetMargin={settings.targetMargin}
                product={{
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  imageUrl: product.imageUrl,
                  basePrice: product.basePrice,
                  targetMargin: product.targetMargin,
                  active: product.active,
                  businessName: product.business?.name ?? null,
                  costItems: product.costItems,
                  usageCount: product._count.collectionItems,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
