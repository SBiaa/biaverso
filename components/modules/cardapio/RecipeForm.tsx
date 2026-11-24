"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  Button,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  ingredientKindLabels,
  ingredientRoleLabels,
  recipeCategoryLabels,
} from "@/lib/labels";
import {
  recipeStatus,
  statusLong,
  type IngredientRoleValue,
  type RecipeItemView,
} from "@/lib/pratos";
import { cn } from "@/lib/utils";

const categoryOptions = Object.keys(recipeCategoryLabels);
const roleOptions = Object.keys(ingredientRoleLabels) as IngredientRoleValue[];
const kindOptions = Object.keys(ingredientKindLabels);

/** O que a despensa já tem, para autocompletar e mostrar o status ao digitar. */
export type PantryOption = {
  id: string;
  name: string;
  inStock: boolean;
  kind: string;
  alwaysHave: boolean;
};

export type RecipeFormInitial = {
  id: string;
  title: string;
  categories: string[];
  description: string | null;
  ingredientsText: string | null;
  steps: string | null;
  prepTime: number | null;
  items: { name: string; quantity: string | null; role: IngredientRoleValue }[];
};

type ItemDraft = {
  name: string;
  quantity: string;
  role: IngredientRoleValue;
  /** Só usado quando o ingrediente ainda não existe na despensa. */
  kind: string;
};

const emptyDraft = (): ItemDraft => ({ name: "", quantity: "", role: "PRECISA", kind: "OUTRO" });

type FormState = {
  title: string;
  categories: string[];
  prepTime: string;
  description: string;
  items: ItemDraft[];
  ingredientsText: string;
  steps: string;
};

function emptyForm(): FormState {
  return {
    title: "",
    categories: [],
    prepTime: "",
    description: "",
    items: [],
    ingredientsText: "",
    steps: "",
  };
}

function formFromRecipe(recipe: RecipeFormInitial): FormState {
  return {
    title: recipe.title,
    categories: recipe.categories,
    prepTime: recipe.prepTime ? String(recipe.prepTime) : "",
    description: recipe.description ?? "",
    items: recipe.items.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? "",
      role: item.role,
      kind: "OUTRO",
    })),
    ingredientsText: recipe.ingredientsText ?? "",
    steps: recipe.steps ?? "",
  };
}

/**
 * Criar ou editar um prato.
 *
 * Cada ingrediente tem um papel: "Precisa" (sem isso não sai), "Escolha um"
 * (basta um do grupo: macarrão com carne moída, frango ou atum) e "Se tiver".
 * A prévia embaixo da lista diz, com a despensa de hoje, se dá pra fazer e o
 * que falta — é o que separa "tenho o frango mas não tenho com que empanar"
 * de "não tenho frango".
 */
export function RecipeFormModal({
  recipe,
  pantry,
  onClose,
}: {
  recipe?: RecipeFormInitial;
  pantry: PantryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!recipe;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(recipe ? formFromRecipe(recipe) : emptyForm());
  const [draft, setDraftState] = useState<ItemDraft>(emptyDraft);
  // Espelho do rascunho fora do ciclo de render: digitar "3" e apertar Enter
  // no mesmo instante fazia o handler ler o estado ainda sem o "3".
  const draftRef = useRef(draft);
  const nameRef = useRef<HTMLInputElement>(null);

  function setDraft(next: ItemDraft | ((prev: ItemDraft) => ItemDraft)) {
    const value = typeof next === "function" ? next(draftRef.current) : next;
    draftRef.current = value;
    setDraftState(value);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(category: string) {
    update(
      "categories",
      form.categories.includes(category)
        ? form.categories.filter((c) => c !== category)
        : [...form.categories, category],
    );
  }

  function addItem() {
    const current = draftRef.current;
    const name = current.name.trim();
    if (!name) return;
    setForm((prev) => {
      const exists = prev.items.some((item) => item.name.toLowerCase() === name.toLowerCase());
      return exists
        ? prev
        : {
            ...prev,
            items: [...prev.items, { ...current, name, quantity: current.quantity.trim() }],
          };
    });
    setDraft(emptyDraft());
    nameRef.current?.focus();
  }

  function removeItem(index: number) {
    update(
      "items",
      form.items.filter((_, i) => i !== index),
    );
  }

  function patchItem(index: number, patch: Partial<ItemDraft>) {
    update(
      "items",
      form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  // Enter num campo de ingrediente adiciona o item; o `stopPropagation` é o
  // que impede o modal de tratar o mesmo Enter como "salvar receita".
  function handleItemKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    addItem();
  }

  function pantryMatch(name: string) {
    return pantry.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }

  function pantryStatus(name: string): DotStatus {
    const match = pantryMatch(name);
    if (!match) return "new";
    if (match.alwaysHave) return "always";
    return match.inStock ? "in" : "out";
  }

  // Prévia ao vivo: o mesmo cálculo da biblioteca, com o que tem em casa hoje.
  // Ingrediente novo nasce "falta em casa".
  const previewItems: RecipeItemView[] = form.items.map((item) => {
    const match = pantryMatch(item.name);
    return {
      ingredientId: match?.id ?? item.name,
      name: match?.name ?? item.name,
      quantity: null,
      inStock: match?.inStock ?? false,
      kind: match?.kind ?? item.kind,
      alwaysHave: match?.alwaysHave ?? false,
      role: item.role,
    };
  });
  const preview = recipeStatus(previewItems);
  const previewText = statusLong(preview);
  const optionCount = form.items.filter((item) => item.role === "OPCAO").length;

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("Dê um nome ao prato.");
      return;
    }
    if (form.categories.length === 0) {
      setError("Escolha pelo menos uma refeição em que o prato serve.");
      return;
    }
    setSaving(true);
    setError(null);

    // Um ingrediente digitado mas não adicionado com o "+" entra mesmo assim:
    // esquecer o botão era o jeito mais fácil de perder o último item.
    const pending = draftRef.current.name.trim();
    const items = pending
      ? [
          ...form.items,
          { ...draftRef.current, name: pending, quantity: draftRef.current.quantity.trim() },
        ]
      : form.items;

    const payload = {
      title: form.title,
      categories: form.categories,
      prepTime: form.prepTime || null,
      description: form.description,
      ingredientsText: form.ingredientsText,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity || null,
        role: item.role,
        kind: pantryMatch(item.name) ? undefined : item.kind,
      })),
      steps: form.steps,
    };

    try {
      if (isEdit) await api.patch(`/api/recipes/${recipe!.id}`, payload);
      else await api.post("/api/recipes", payload);
      onClose();
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const suggestions = pantry.filter(
    (p) => !form.items.some((item) => item.name.toLowerCase() === p.name.toLowerCase()),
  );

  return (
    <Modal
      title={isEdit ? "Editar prato" : "Novo prato"}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
    >
      <ErrorNote message={error} />

      <Field label="Nome do prato">
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Frango empanado, Macarrão, Omelete…"
          className={fieldClass}
        />
      </Field>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">Serve para</span>
        <div className="flex flex-wrap gap-1.5">
          {categoryOptions.map((category) => {
            const active = form.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border bg-surface text-text-secondary hover:bg-hover",
                )}
              >
                {recipeCategoryLabels[category]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Tempo de preparo em minutos (opcional)">
        <input
          type="number"
          inputMode="numeric"
          value={form.prepTime}
          onChange={(e) => update("prepTime", e.target.value)}
          className={cn(fieldClass, "max-w-32")}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">O que vai no prato</span>
        <p className="text-xs leading-relaxed text-text-secondary">
          <strong className="font-medium text-text-primary">Precisa</strong>: sem isso não sai (o
          frango e a farinha do empanado).{" "}
          <strong className="font-medium text-text-primary">Escolha um</strong>: basta um deles
          (macarrão com carne moída, frango <em>ou</em> atum).{" "}
          <strong className="font-medium text-text-primary">Se tiver</strong>: melhora, mas não
          impede.
        </p>
        {form.items.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {form.items.map((item, index) => {
              const status = pantryStatus(item.name);
              return (
                <li
                  key={`${item.name}-${index}`}
                  className="flex flex-col gap-1.5 rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <span className="min-w-0 flex-1 truncate text-text-primary">{item.name}</span>
                    <input
                      aria-label={`Quantidade de ${item.name}`}
                      placeholder="Qtd"
                      value={item.quantity}
                      onChange={(e) => patchItem(index, { quantity: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Tirar ${item.name}`}
                      className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-hover-strong hover:text-text-primary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-4">
                    <RoleToggle
                      value={item.role}
                      name={item.name}
                      onChange={(role) => patchItem(index, { role })}
                    />
                    {status === "new" && (
                      <label className="flex items-center gap-1 text-xs text-text-secondary">
                        novo, é
                        <select
                          value={item.kind}
                          onChange={(e) => patchItem(index, { kind: e.target.value })}
                          aria-label={`Tipo de ${item.name}`}
                          className="h-8 rounded-md border border-border bg-surface px-1.5 text-xs text-text-primary"
                        >
                          {kindOptions.map((kind) => (
                            <option key={kind} value={kind}>
                              {ingredientKindLabels[kind]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
          <input
            ref={nameRef}
            list="pantry-options"
            placeholder="Adicionar ingrediente"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={handleItemKeyDown}
            className={fieldClass}
            autoComplete="off"
          />
          <datalist id="pantry-options">
            {suggestions.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <input
            placeholder="Qtd"
            value={draft.quantity}
            onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
            onKeyDown={handleItemKeyDown}
            className={fieldClass}
          />
          <Button variant="secondary" onClick={addItem} className="px-3" aria-label="Adicionar ingrediente">
            +
          </Button>
        </div>
        {optionCount === 1 && (
          <p className="text-xs text-warning-soft-text">
            Só uma opção em “Escolha um”: adicione as outras ou mude para “Precisa”.
          </p>
        )}
        {previewText && (
          <p
            role="status"
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-medium",
              preview.state === "pronto"
                ? "bg-success-soft-bg text-success-soft-text"
                : "bg-warning-soft-bg text-warning-soft-text",
            )}
          >
            Com o que tem em casa hoje: {previewText.charAt(0).toLowerCase() + previewText.slice(1)}
          </p>
        )}
      </div>

      <Field label="Modo de preparo (opcional)">
        <textarea
          value={form.steps}
          onChange={(e) => update("steps", e.target.value)}
          rows={3}
          className={cn(fieldClass, "resize-none")}
        />
      </Field>

      <Field label="Observação (opcional)">
        <input
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={fieldClass}
        />
      </Field>

      {/* As receitas antigas guardam os ingredientes só em texto. O campo fica
          visível enquanto tiver conteúdo, para ela converter no seu tempo. */}
      {(form.ingredientsText || (isEdit && form.items.length === 0)) && (
        <Field label="Ingredientes em texto (antigo, opcional)">
          <textarea
            value={form.ingredientsText}
            onChange={(e) => update("ingredientsText", e.target.value)}
            rows={2}
            className={cn(fieldClass, "resize-none")}
          />
        </Field>
      )}

      <ModalActions>
        <Button type="submit" disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}

function RoleToggle({
  value,
  name,
  onChange,
}: {
  value: IngredientRoleValue;
  name: string;
  onChange: (role: IngredientRoleValue) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`Papel de ${name} no prato`} className="flex gap-1">
      {roleOptions.map((role) => (
        <button
          key={role}
          type="button"
          role="radio"
          aria-checked={value === role}
          onClick={() => onChange(role)}
          className={cn(
            "min-h-8 rounded-full border px-2.5 text-xs font-medium transition-colors",
            value === role
              ? "border-accent bg-accent/10 text-accent-ink"
              : "border-border text-text-secondary hover:bg-hover",
          )}
        >
          {ingredientRoleLabels[role]}
        </button>
      ))}
    </div>
  );
}

export type DotStatus = "in" | "out" | "new" | "always";

const dotTitles: Record<DotStatus, string> = {
  in: "Tem em casa",
  out: "Falta em casa",
  new: "Novo na despensa",
  always: "Básico, sempre tem",
};

/** Verde = tem em casa, vazio = falta, tracejado = novo na despensa, cinza = sempre tem. */
export function StatusDot({ status }: { status: DotStatus }) {
  return (
    <span
      aria-hidden
      title={dotTitles[status]}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full border",
        status === "in" && "border-success bg-success",
        status === "always" && "border-text-secondary bg-text-secondary/40",
        status === "out" && "border-danger bg-transparent",
        status === "new" && "border-dashed border-text-secondary bg-transparent",
      )}
    />
  );
}

export function NewRecipeButton({ pantry }: { pantry: PantryOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo prato</Button>
      {open && <RecipeFormModal pantry={pantry} onClose={() => setOpen(false)} />}
    </>
  );
}
