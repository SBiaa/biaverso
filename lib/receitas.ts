import type { z } from "zod";
import { prisma } from "./prisma";
import { ApiError } from "./api";
import type { Prisma } from "@/app/generated/prisma/client";
import type { recipeSchema } from "./schemas";
import {
  missingCount,
  recipeStatus,
  type RecipeItemView,
  type RecipeView,
} from "./pratos";

export type { RecipeItemView, RecipeView } from "./pratos";

/**
 * Lado do servidor do cardápio: receita com itens da despensa e a lista de
 * compras da semana. O `lib/cardapio.ts` continua sendo o que roda também no
 * navegador (datas da semana), por isso o Prisma mora aqui.
 */

type RecipeInput = z.output<typeof recipeSchema>;

/**
 * Acha o ingrediente pelo nome sem ligar para maiúsculas, ou cria. É o que
 * impede "Ovo" e "ovo" de virarem dois itens e a despensa de ficar em dobro.
 */
async function resolveIngredient(
  tx: Prisma.TransactionClient,
  name: string,
  kind: RecipeInput["items"][number]["kind"],
) {
  const existing = await tx.ingredient.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  // O tipo escolhido no formulário só vale para quem nasce aqui: um ingrediente
  // que já existe mantém o tipo que a despensa deu a ele.
  return existing ?? tx.ingredient.create({ data: { name, ...(kind ? { kind } : {}) } });
}

/** Cria ou atualiza a receita e troca a lista de itens de uma vez. */
export async function saveRecipe(input: RecipeInput, id?: string) {
  const { items, ...fields } = input;
  const data = { ...fields, prepTime: fields.prepTime ?? null };

  return prisma.$transaction(async (tx) => {
    const recipe = id
      ? await tx.recipe.update({ where: { id }, data })
      : await tx.recipe.create({ data });

    // Repetir o mesmo ingrediente na lista (com grafia diferente) estouraria a
    // unique de (receita, ingrediente): fica o primeiro.
    const seen = new Set<string>();
    const rows: Prisma.RecipeIngredientCreateManyInput[] = [];
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const ingredient = await resolveIngredient(tx, item.name, item.kind);
      rows.push({
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        quantity: item.quantity ?? null,
        role: item.role,
        position: rows.length,
      });
    }

    // Apaga e recria em vez de casar linha por linha: a lista é curta e a
    // ordem vem inteira do formulário.
    await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    if (rows.length > 0) await tx.recipeIngredient.createMany({ data: rows });

    return recipe;
  });
}

/** Cria um ingrediente da despensa recusando nome repetido (em qualquer caixa). */
export async function createIngredient(data: Prisma.IngredientCreateInput) {
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) throw new ApiError(409, `"${existing.name}" já está na despensa.`);
  return prisma.ingredient.create({ data });
}

export const recipeLibraryInclude = {
  items: {
    orderBy: { position: "asc" },
    select: {
      quantity: true,
      role: true,
      ingredient: {
        select: { id: true, name: true, inStock: true, kind: true, alwaysHave: true },
      },
    },
  },
  _count: { select: { mealPlans: true } },
} satisfies Prisma.RecipeInclude;

type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeLibraryInclude }>;

export function toRecipeView(recipe: RecipeRow): RecipeView {
  const items: RecipeItemView[] = recipe.items.map((item) => ({
    ingredientId: item.ingredient.id,
    name: item.ingredient.name,
    quantity: item.quantity,
    inStock: item.ingredient.inStock,
    kind: item.ingredient.kind,
    alwaysHave: item.ingredient.alwaysHave,
    role: item.role,
  }));
  const status = recipeStatus(items);
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    categories: recipe.categories,
    ingredientsText: recipe.ingredientsText,
    steps: recipe.steps,
    prepTime: recipe.prepTime,
    mealPlansCount: recipe._count.mealPlans,
    items,
    status,
    missing: missingCount(status),
  };
}

export type ShoppingUse = {
  recipeTitle: string;
  quantity: string | null;
  dayOfWeek: number;
  mealType: string;
};

export type ShoppingItem = {
  ingredientId: string;
  name: string;
  /** Onde o item entra na semana, em ordem de dia. */
  uses: ShoppingUse[];
};

/**
 * O que falta comprar para a semana: cada ingrediente que alguma receita
 * planejada usa e que não está em casa, com as refeições que dependem dele.
 */
export async function getShoppingList(weekStart: Date): Promise<{
  items: ShoppingItem[];
  /** Quantos ingredientes distintos a semana pede no total. */
  total: number;
}> {
  const plans = await prisma.mealPlan.findMany({
    where: { weekStart, recipeId: { not: null } },
    orderBy: [{ dayOfWeek: "asc" }],
    select: {
      dayOfWeek: true,
      mealType: true,
      optionIngredientId: true,
      recipe: {
        select: {
          title: true,
          items: {
            orderBy: { position: "asc" },
            select: {
              quantity: true,
              role: true,
              ingredient: {
                select: { id: true, name: true, inStock: true, alwaysHave: true },
              },
            },
          },
        },
      },
    },
  });

  const byIngredient = new Map<string, ShoppingItem>();
  const all = new Set<string>();
  for (const plan of plans) {
    if (!plan.recipe) continue;
    // Do "escolha um" entra só a opção do horário. Sem escolha gravada, vale
    // uma que já esteja em casa (nada a comprar) ou, faltando todas, a primeira.
    const options = plan.recipe.items.filter((item) => item.role === "OPCAO");
    const chosen =
      options.find((item) => item.ingredient.id === plan.optionIngredientId) ??
      options.find((item) => item.ingredient.inStock || item.ingredient.alwaysHave) ??
      options[0];
    const needed = plan.recipe.items.filter(
      (item) => item.role === "PRECISA" || item === chosen,
    );
    for (const item of needed) {
      if (item.ingredient.alwaysHave) continue;
      all.add(item.ingredient.id);
      if (item.ingredient.inStock) continue;
      const entry = byIngredient.get(item.ingredient.id) ?? {
        ingredientId: item.ingredient.id,
        name: item.ingredient.name,
        uses: [],
      };
      entry.uses.push({
        recipeTitle: plan.recipe.title,
        quantity: item.quantity,
        dayOfWeek: plan.dayOfWeek,
        mealType: plan.mealType,
      });
      byIngredient.set(item.ingredient.id, entry);
    }
  }

  // Primeiro o que a semana pede mais cedo; empate pelo nome.
  const items = [...byIngredient.values()].sort(
    (a, b) =>
      a.uses[0].dayOfWeek - b.uses[0].dayOfWeek || a.name.localeCompare(b.name, "pt-BR"),
  );
  return { items, total: all.size };
}
