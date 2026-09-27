import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { MaterialsList } from "@/components/modules/produtos/MaterialsList";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const materials = await prisma.material.findMany({
    orderBy: { name: "asc" },
    include: {
      // Quantos PRODUTOS usam, não quantas linhas: um produto que gasta duas
      // folhas de transfer em dois momentos ainda é um produto só.
      costItems: { select: { productId: true }, distinct: ["productId"] },
    },
  });

  return (
    <>
      <Topbar title="Insumos" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Link
          href="/produtos"
          className="text-xs font-medium text-text-secondary hover:text-accent"
        >
          ← Central de produtos
        </Link>

        <Card>
          <p className="text-sm text-text-secondary">
            O que você compra em pacote e gasta por peça. O preço fica guardado
            como você compra — R$120 o pacote de 50 — e o app divide para achar o
            custo por unidade. Reajustar aqui recalcula a margem de todo produto
            que usa o insumo, de uma vez.
          </p>
        </Card>

        <MaterialsList
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            packPrice: m.packPrice,
            packQuantity: m.packQuantity,
            supplier: m.supplier,
            notes: m.notes,
            updatedAt: m.updatedAt.toISOString(),
            usageCount: m.costItems.length,
          }))}
        />
      </main>
    </>
  );
}
