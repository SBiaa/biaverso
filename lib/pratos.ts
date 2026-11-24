/**
 * O prato visto pela despensa: o que precisa, o "escolha um" e o "se tiver",
 * e a conta de "dá pra fazer?". Roda no navegador também (formulário com
 * prévia ao vivo, sorteio), por isso não importa o Prisma.
 */

export type IngredientRoleValue = "PRECISA" | "OPCAO" | "OPCIONAL";

export type RecipeItemView = {
  ingredientId: string;
  name: string;
  quantity: string | null;
  inStock: boolean;
  kind: string;
  /** Básico que sempre tem (sal, óleo): nunca falta. */
  alwaysHave: boolean;
  role: IngredientRoleValue;
};

export type RecipeStatus =
  | { state: "sem-itens" }
  /** `options`: as opções do "escolha um" que estão em casa (vazio se o prato não tem opções). */
  | { state: "pronto"; options: string[] }
  /**
   * `have`: o que já está em casa entre o que precisa (para dizer "tem frango,
   * falta farinha"). `noOption`: o prato tem "escolha um" e nenhum está em casa.
   */
  | { state: "falta"; missing: string[]; have: string[]; noOption: boolean; optionNames: string[] };

export type RecipeView = {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  ingredientsText: string | null;
  steps: string | null;
  prepTime: number | null;
  mealPlansCount: number;
  items: RecipeItemView[];
  status: RecipeStatus;
  /** Quantas coisas faltam (cada item que precisa, mais 1 se nenhuma opção está em casa). */
  missing: number;
};

/** Um ingrediente conta como "em casa" se está marcado ou se é básico. */
export function hasAtHome(item: Pick<RecipeItemView, "inStock" | "alwaysHave">) {
  return item.inStock || item.alwaysHave;
}

export function recipeStatus(items: RecipeItemView[]): RecipeStatus {
  if (items.length === 0) return { state: "sem-itens" };
  const needed = items.filter((i) => i.role === "PRECISA");
  const options = items.filter((i) => i.role === "OPCAO");
  const missing = needed.filter((i) => !hasAtHome(i)).map((i) => i.name);
  const have = needed.filter((i) => hasAtHome(i) && !i.alwaysHave).map((i) => i.name);
  const optionsHome = options.filter(hasAtHome).map((i) => i.name);
  const noOption = options.length > 0 && optionsHome.length === 0;
  if (missing.length === 0 && !noOption) return { state: "pronto", options: optionsHome };
  return {
    state: "falta",
    missing,
    have: [...have, ...optionsHome],
    noOption,
    optionNames: options.map((i) => i.name),
  };
}

export function missingCount(status: RecipeStatus) {
  if (status.state !== "falta") return 0;
  return status.missing.length + (status.noOption ? 1 : 0);
}

/** "a", "a e b", "a, b e c" */
export function joinPt(names: string[], last = "e") {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${last} ${names[names.length - 1]}`;
}

function lower(names: string[]) {
  return names.map((n) => n.toLocaleLowerCase("pt-BR"));
}

/**
 * O status em uma frase curta, para pílula e card.
 * "Dá pra fazer" · "Falta farinha de rosca e ovo" · "Falta carne moída, frango ou atum"
 */
export function statusShort(status: RecipeStatus): string | null {
  if (status.state === "sem-itens") return null;
  if (status.state === "pronto") return "Dá pra fazer";
  const parts = [...lower(status.missing)];
  if (status.noOption) parts.push(joinPt(lower(status.optionNames), "ou"));
  return `Falta ${joinPt(parts)}`;
}

/** A frase longa, com o que já tem: "Tem frango · falta farinha de rosca e ovo". */
export function statusLong(status: RecipeStatus): string | null {
  if (status.state !== "falta" || status.have.length === 0) return statusShort(status);
  const short = statusShort(status)!;
  return `Tem ${joinPt(lower(status.have))} · ${short.charAt(0).toLowerCase()}${short.slice(1)}`;
}

/** Título de um horário do cardápio: "Macarrão · com frango". */
export function mealTitle(
  recipeTitle: string | null | undefined,
  optionName: string | null | undefined,
) {
  if (!recipeTitle) return null;
  return optionName ? `${recipeTitle} · com ${optionName.toLocaleLowerCase("pt-BR")}` : recipeTitle;
}
