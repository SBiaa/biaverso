import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Server-only: importa "@/lib/prisma". Os helpers puros de pedido continuam em
 * "@/lib/loja", que os componentes "use client" também usam.
 */

type ItemInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  notes?: string | null;
  productId?: string | null;
  collectionProductId?: string | null;
};

/** Só os campos que a linha do pedido guarda — o resto vem do formulário. */
function toCreateData(item: ItemInput) {
  return {
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    notes: item.notes ?? null,
    productId: item.productId ?? null,
    collectionProductId: item.collectionProductId ?? null,
  };
}

export function orderTotals(items: ItemInput[]) {
  return items.reduce(
    (acc, item) => {
      acc.totalAmount += item.quantity * item.unitPrice;
      acc.totalCost += item.quantity * item.unitCost;
      return acc;
    },
    { totalAmount: 0, totalCost: 0 },
  );
}

/**
 * Troca a lista de itens de um pedido e regrava os totais.
 *
 * Apaga e recria em vez de casar linha a linha: o formulário edita o pedido
 * inteiro de uma vez, e tentar adivinhar quais linhas são "as mesmas" só
 * abriria espaço para o total ficar diferente da soma dos itens. Tudo numa
 * transação para que nenhum instante mostre itens novos com total velho.
 */
export async function replaceOrderItems(
  orderId: string,
  items: ItemInput[],
  extraData: Prisma.OrderUpdateInput = {},
) {
  const totals = orderTotals(items);

  return prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    if (items.length > 0) {
      await tx.orderItem.createMany({
        data: items.map((item) => ({ ...toCreateData(item), orderId })),
      });
    }
    return tx.order.update({
      where: { id: orderId },
      data: { ...extraData, ...totals },
    });
  });
}
