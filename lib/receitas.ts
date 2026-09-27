import type { z } from "zod";
import { prisma } from "./prisma";
import { ApiError } from "./api";
import type { Prisma } from "@/app/generated/prisma/client";
import type { recipeSchema } from "./schemas";

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
async function resolveIngredient(tx: Prisma.TransactionClient, name: string) {
  const existing = await tx.ingredient.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  return existing ?? tx.ingredient.create({ data: { name } });
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
      const ingredient = await resolveIngredient(tx, item.name);
      rows.push({
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        quantity: item.quantity ?? null,
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
export async function createIngredient(data: {
  name: string;
  inStock: boolean;
  notes: string | null;
}) {
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
      ingredient: { select: { id: true, name: true, inStock: true } },
    },
  },
  _count: { select: { mealPlans: true } },
} satisfies Prisma.RecipeInclude;

type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeLibraryInclude }>;

export type RecipeItemView = {
  ingredientId: string;
  name: string;
  quantity: string | null;
  inStock: boolean;
};

export type RecipeView = {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  ingredientsText: string | null;
  steps: string;
  prepTime: number | null;
  mealPlansCount: number;
  items: RecipeItemView[];
  /** Quantos itens faltam em casa. Zero com itens = dá para fazer agora. */
  missing: number;
};

export function toRecipeView(recipe: RecipeRow): RecipeView {
  const items = recipe.items.map((item) => ({
    ingredientId: item.ingredient.id,
    name: item.ingredient.name,
    quantity: item.quantity,
    inStock: item.ingredient.inStock,
  }));
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
    missing: items.filter((item) => !item.inStock).length,
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
      recipe: {
        select: {
          title: true,
          items: {
            select: {
              quantity: true,
              ingredient: { select: { id: true, name: true, inStock: true } },
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
    for (const item of plan.recipe.items) {
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
