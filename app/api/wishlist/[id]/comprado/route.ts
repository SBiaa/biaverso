import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { wishlistPurchaseSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * Marca o desejo como comprado. `createTransaction` lança a saída no
 * financeiro — a transação nasce solta de propósito: apagar o desejo depois
 * não pode apagar um gasto que de fato aconteceu.
 */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { boughtPrice, boughtAt, createTransaction } = await parseBody(
    request,
    wishlistPurchaseSchema,
  );

  const wish = await prisma.wishlistItem.findUniqueOrThrow({ where: { id } });
  const price = boughtPrice ?? wish.price;
  const date = boughtAt ?? todayUtc();

  if (createTransaction && !price) {
    throw new ApiError(400, "Informe quanto custou para lançar no financeiro.");
  }

  const item = await prisma.$transaction(async (tx) => {
    if (createTransaction && price) {
      await tx.transaction.create({
        data: {
          name: wish.name,
          type: "SAIDA",
          amount: price,
          date,
          // Gasto de negócio é custo operacional; o resto é gasto pessoal.
          category: wish.businessId ? "CUSTO_OPERACIONAL" : "GASTO_PESSOAL",
          businessId: wish.businessId,
        },
      });
    }

    return tx.wishlistItem.update({
      where: { id },
      data: { status: "COMPRADO", boughtAt: date, boughtPrice: price },
    });
  });

  return NextResponse.json(item);
});
