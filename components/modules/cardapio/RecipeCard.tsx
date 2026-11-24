"use client";

import { useState } from "react";
import { ClickableCard } from "@/components/ui";
import { recipeCategoryLabels } from "@/lib/labels";
import type { RecipeView } from "@/lib/pratos";
import type { PantryOption } from "./RecipeForm";
import { RecipeModal, StatusPill } from "./RecipeModal";

/**
 * Um card por prato, todos do mesmo tamanho (como em Ideias): nome, o que
 * falta e para que refeição serve. Ingredientes, preparo e edição moram na
 * janela do prato.
 */
export function RecipeCard({ recipe, pantry }: { recipe: RecipeView; pantry: PantryOption[] }) {
  const [open, setOpen] = useState(false);
  const options = recipe.items.filter((item) => item.role === "OPCAO");

  return (
    <>
      <ClickableCard
        onActivate={() => setOpen(true)}
        label={`Abrir o prato ${recipe.title}`}
        className="flex h-full flex-col gap-2"
      >
        <p className="line-clamp-2 text-sm font-semibold text-text-primary">{recipe.title}</p>
        {options.length > 0 && (
          <p className="line-clamp-1 text-xs text-text-secondary">
            com {options.map((o) => o.name.toLocaleLowerCase("pt-BR")).join(" / ")}
          </p>
        )}
        <div>
          {recipe.status.state === "sem-itens" ? (
            <span className="text-xs text-text-secondary">Sem ingredientes cadastrados</span>
          ) : (
            <StatusPill recipe={recipe} />
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-text-secondary">
          <span className="truncate">
            {recipe.categories.map((c) => recipeCategoryLabels[c] ?? c).join(" · ")}
          </span>
          {recipe.prepTime && <span className="ml-auto shrink-0">{recipe.prepTime} min</span>}
        </div>
      </ClickableCard>

      {open && <RecipeModal recipe={recipe} pantry={pantry} onClose={() => setOpen(false)} />}
    </>
  );
}
