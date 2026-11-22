import { hasAtHome, joinPt, missingCount, recipeStatus, type RecipeView } from "./pratos";

/**
 * Sorteio de refeições. Roda no navegador: "sortear de novo" é instantâneo e
 * não grava nada até ela aceitar.
 *
 * Regras, em ordem de força:
 * 1. Prato marcado para a refeição (almoço, janta...). Sem nenhum, vale qualquer um menos sobremesa.
 * 2. Não repetir a proteína da refeição anterior nem da mesma refeição ontem (quase proibido).
 * 3. Preferir o que dá pra fazer com o que tem em casa.
 * 4. Proteína dos últimos dois dias pesa menos.
 * O resto é sorte, com esses pesos.
 */

/** A ordem dos horários de um dia na grade. */
export const SLOT_MEALS = ["CAFE_DA_MANHA", "ALMOCO", "JANTAR"] as const;

/** Um horário no tempo: `day` é o índice do dia contado de uma segunda qualquer (pode ser negativo). */
export type Slot = { day: number; mealType: string };

/** O que já está (ou foi) no prato num horário. */
export type SlotPlan = { recipeId: string; optionIngredientId: string | null };

export type MealPick = {
  recipeId: string;
  optionIngredientId: string | null;
  reasons: string[];
};

export type DrawResult = { pick: MealPick } | { pick: null; reason: string };

export type DrawOptions = {
  /** Só pratos que dá pra fazer agora. */
  onlyAtHome: boolean;
  /** Pratos a não sortear agora (o atual, para "outro"). */
  exclude?: string[];
  random?: () => number;
};

type Candidate = {
  recipe: RecipeView;
  optionId: string | null;
  optionName: string | null;
  proteins: Map<string, string>;
  ready: boolean;
  missing: number;
};

export function slotKey(slot: Slot) {
  return `${slot.day}-${slot.mealType}`;
}

function mealIndex(mealType: string) {
  return SLOT_MEALS.indexOf(mealType as (typeof SLOT_MEALS)[number]);
}

/**
 * A refeição "de antes" para a regra da proteína: a janta vem depois do
 * almoço do mesmo dia; o almoço, depois da janta de ontem. O café só se
 * compara com o café de ontem (ovo no café não impede frango no almoço).
 */
function previousMainSlot(slot: Slot): Slot | null {
  if (slot.mealType === "JANTAR") return { day: slot.day, mealType: "ALMOCO" };
  if (slot.mealType === "ALMOCO") return { day: slot.day - 1, mealType: "JANTAR" };
  return null;
}
function nextMainSlot(slot: Slot): Slot | null {
  if (slot.mealType === "ALMOCO") return { day: slot.day, mealType: "JANTAR" };
  if (slot.mealType === "JANTAR") return { day: slot.day + 1, mealType: "ALMOCO" };
  return null;
}

/** As proteínas de um prato servido com uma opção (ou sem). id → nome. */
export function proteinsOf(recipe: RecipeView, optionId: string | null) {
  const map = new Map<string, string>();
  for (const item of recipe.items) {
    if (item.kind !== "PROTEINA") continue;
    if (item.role === "PRECISA" || (item.role === "OPCAO" && item.ingredientId === optionId)) {
      map.set(item.ingredientId, item.name);
    }
  }
  return map;
}

function candidatesFor(recipe: RecipeView): Candidate[] {
  const options = recipe.items.filter((i) => i.role === "OPCAO");
  const base = recipe.items.filter((i) => i.role !== "OPCAO");
  // Cada opção do "escolha um" vira uma variante com a própria conta de despensa.
  const variants = options.length > 0 ? options.map((o) => o) : [null];
  return variants.map((option) => {
    const items = option ? [...base, option] : base;
    const status = recipeStatus(items);
    return {
      recipe,
      optionId: option?.ingredientId ?? null,
      optionName: option?.name ?? null,
      proteins: proteinsOf(recipe, option?.ingredientId ?? null),
      ready: status.state === "pronto",
      missing: missingCount(status),
    };
  });
}

function lower(s: string) {
  return s.toLocaleLowerCase("pt-BR");
}

/**
 * Sorteia um prato para `slot`. `history` é tudo que já está planejado em
 * volta (semana anterior e esta), por horário.
 */
export function drawMeal(
  recipes: RecipeView[],
  slot: Slot,
  history: Map<string, SlotPlan>,
  options: DrawOptions,
): DrawResult {
  const random = options.random ?? Math.random;
  const byId = new Map(recipes.map((r) => [r.id, r]));

  const forMeal = recipes.filter((r) => r.categories.includes(slot.mealType));
  const pool =
    forMeal.length > 0 ? forMeal : recipes.filter((r) => !r.categories.every((c) => c === "SOBREMESA"));
  if (pool.length === 0) return { pick: null, reason: "Nenhum prato cadastrado ainda." };

  function planAt(s: Slot | null) {
    if (!s) return null;
    const plan = history.get(slotKey(s));
    const recipe = plan ? byId.get(plan.recipeId) : undefined;
    return plan && recipe ? { plan, recipe, proteins: proteinsOf(recipe, plan.optionIngredientId) } : null;
  }

  // Vizinhos fortes: a refeição anterior, a seguinte (se já planejada) e a
  // mesma refeição ontem e amanhã.
  const strong = [
    { at: planAt(previousMainSlot(slot)), label: slot.mealType === "JANTAR" ? "No almoço" : "Ontem à noite", past: true },
    { at: planAt({ day: slot.day - 1, mealType: slot.mealType }), label: "Ontem", past: true },
    { at: planAt(nextMainSlot(slot)), label: slot.mealType === "ALMOCO" ? "Na janta" : "Amanhã no almoço", past: false },
    { at: planAt({ day: slot.day + 1, mealType: slot.mealType }), label: "Amanhã", past: false },
  ].filter((n) => n.at);
  // Fracos: as refeições principais dos dois dias anteriores.
  const weak = [-1, -2]
    .flatMap((d) => ["ALMOCO", "JANTAR"].map((m) => planAt({ day: slot.day + d, mealType: m })))
    .filter((p) => p !== null);

  const prevSame = planAt(previousMainSlot(slot) ?? { day: slot.day - 1, mealType: slot.mealType });
  const exclude = new Set(options.exclude ?? []);

  const weighted: { c: Candidate; weight: number; reasons: string[] }[] = [];
  for (const recipe of pool) {
    if (exclude.has(recipe.id)) continue;
    // Mesmo prato de novo na refeição seguinte: fica de fora.
    if (prevSame?.recipe.id === recipe.id) continue;
    const variants = candidatesFor(recipe);
    for (const c of variants) {
      if (options.onlyAtHome && !c.ready) continue;
      // Um prato com 3 opções não pode ter 3 vezes mais chance que os outros.
      let weight = 1 / variants.length;
      const reasons: string[] = [];

      if (c.ready) {
        weight *= 4;
        reasons.push("Dá pra fazer com o que tem em casa");
      } else if (c.recipe.items.length === 0) {
        reasons.push("Sem ingredientes cadastrados");
      } else if (c.missing <= 2) {
        const status = recipeStatus(
          c.recipe.items.filter((i) => i.role !== "OPCAO" || i.ingredientId === c.optionId),
        );
        const names = status.state === "falta" ? status.missing : [];
        reasons.push(names.length > 0 ? `Falta ${joinPt(names.map(lower))}` : "Falta pouca coisa");
      } else {
        weight *= 0.2;
        reasons.push(`Falta${c.missing > 1 ? "m" : ""} ${c.missing} itens`);
      }

      let clash: { label: string; name: string; past: boolean } | null = null;
      for (const n of strong) {
        for (const [id, name] of n.at!.proteins) {
          if (c.proteins.has(id)) clash = clash ?? { label: n.label, name, past: n.past };
        }
      }
      if (clash) {
        weight *= 0.05;
        reasons.push(`${clash.label} ${clash.past ? "também teve" : "também tem"} ${lower(clash.name)}`);
      } else if (weak.some((p) => [...p.proteins.keys()].some((id) => c.proteins.has(id)))) {
        weight *= 0.5;
      } else {
        // O "porquê" que ela pediu: diz o que foi evitado.
        const first = strong.find((n) => n.past && n.at!.proteins.size > 0);
        if (first && c.proteins.size > 0) {
          reasons.unshift(
            `${first.label} teve ${lower([...first.at!.proteins.values()][0])}, então agora vem ${lower([...c.proteins.values()][0])}`,
          );
        }
      }

      weighted.push({ c, weight, reasons });
    }
  }

  if (weighted.length === 0) {
    if (options.onlyAtHome) {
      return {
        pick: null,
        reason: "Nada dá pra fazer só com o que tem em casa. Desligue \"só com o que tenho\" para ver outros.",
      };
    }
    return { pick: null, reason: "Não sobrou prato para sortear aqui." };
  }

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = random() * total;
  let chosen = weighted[weighted.length - 1];
  for (const w of weighted) {
    roll -= w.weight;
    if (roll < 0) {
      chosen = w;
      break;
    }
  }
  return {
    pick: {
      recipeId: chosen.c.recipe.id,
      optionIngredientId: chosen.c.optionId,
      reasons: chosen.reasons,
    },
  };
}

/**
 * Sorteia vários horários em ordem (dia, depois refeição), alimentando o
 * histórico com cada escolha para não repetir proteína dentro da semana.
 */
export function drawMany(
  recipes: RecipeView[],
  slots: Slot[],
  history: Map<string, SlotPlan>,
  options: DrawOptions,
): Map<string, DrawResult> {
  const ordered = [...slots].sort(
    (a, b) => a.day - b.day || mealIndex(a.mealType) - mealIndex(b.mealType),
  );
  const working = new Map(history);
  const results = new Map<string, DrawResult>();
  for (const slot of ordered) {
    const result = drawMeal(recipes, slot, working, options);
    results.set(slotKey(slot), result);
    if (result.pick) {
      working.set(slotKey(slot), {
        recipeId: result.pick.recipeId,
        optionIngredientId: result.pick.optionIngredientId,
      });
    }
  }
  return results;
}

/** Opções do "escolha um" de um prato, as que estão em casa primeiro. */
export function recipeOptions(recipe: RecipeView) {
  const options = recipe.items.filter((i) => i.role === "OPCAO");
  return [...options.filter(hasAtHome), ...options.filter((o) => !hasAtHome(o))];
}
