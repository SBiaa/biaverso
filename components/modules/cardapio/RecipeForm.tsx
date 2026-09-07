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
import { recipeCategoryLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const categoryOptions = Object.keys(recipeCategoryLabels);

/** O que a despensa já tem, para autocompletar e mostrar o status ao digitar. */
export type PantryOption = { id: string; name: string; inStock: boolean };

export type RecipeFormInitial = {
  id: string;
  title: string;
  categories: string[];
  description: string | null;
  ingredientsText: string | null;
  steps: string;
  prepTime: number | null;
  items: { name: string; quantity: string | null }[];
};

type ItemDraft = { name: string; quantity: string };

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
    items: recipe.items.map((item) => ({ name: item.name, quantity: item.quantity ?? "" })),
    ingredientsText: recipe.ingredientsText ?? "",
    steps: recipe.steps,
  };
}

/**
 * Criar ou editar uma receita.
 *
 * Virou modal porque cresceu: além do texto, agora tem as refeições em que a
 * receita serve (várias) e a lista de ingredientes ligada à despensa. Inline
 * dentro do card ela empurrava a biblioteca inteira para baixo.
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
  const [draft, setDraftState] = useState<ItemDraft>({ name: "", quantity: "" });
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
        : { ...prev, items: [...prev.items, { name, quantity: current.quantity.trim() }] };
    });
    setDraft({ name: "", quantity: "" });
    nameRef.current?.focus();
  }

  function removeItem(index: number) {
    update(
      "items",
      form.items.filter((_, i) => i !== index),
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

  function pantryStatus(name: string) {
    const match = pantry.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!match) return "new" as const;
    return match.inStock ? ("in" as const) : ("out" as const);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.steps.trim()) {
      setError("Título e modo de preparo não podem ficar vazios.");
      return;
    }
    if (form.categories.length === 0) {
      setError("Escolha pelo menos uma refeição em que a receita serve.");
      return;
    }
    setSaving(true);
    setError(null);

    // Um ingrediente digitado mas não adicionado com o "+" entra mesmo assim:
    // esquecer o botão era o jeito mais fácil de perder o último item.
    const pending = draftRef.current.name.trim();
    const items = pending
      ? [...form.items, { name: pending, quantity: draftRef.current.quantity.trim() }]
      : form.items;

    const payload = {
      title: form.title,
      categories: form.categories,
      prepTime: form.prepTime || null,
      description: form.description,
      ingredientsText: form.ingredientsText,
      items: items.map((item) => ({ name: item.name, quantity: item.quantity || null })),
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
      title={isEdit ? "Editar receita" : "Nova receita"}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
    >
      <ErrorNote message={error} />

      <Field label="Título">
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
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

      <div className="grid grid-cols-[1fr_8rem] gap-2">
        <Field label="Descrição (opcional)">
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Preparo (min)">
          <input
            type="number"
            inputMode="numeric"
            value={form.prepTime}
            onChange={(e) => update("prepTime", e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">Ingredientes</span>
        {form.items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {form.items.map((item, index) => {
              const status = pantryStatus(item.name);
              return (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
                >
                  <StatusDot status={status} />
                  <span className="flex-1 text-text-primary">{item.name}</span>
                  {item.quantity && (
                    <span className="text-xs text-text-secondary">{item.quantity}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    aria-label={`Tirar ${item.name}`}
                    className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-hover-strong hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
          <input
            ref={nameRef}
            list="pantry-options"
            placeholder="Ingrediente"
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
          <Button variant="secondary" onClick={addItem} className="px-3">
            +
          </Button>
        </div>
        <p className="text-[11px] text-text-secondary">
          Ingrediente novo entra na despensa como “falta em casa”. Você marca o que
          tem lá.
        </p>
      </div>

      <Field label="Modo de preparo">
        <textarea
          value={form.steps}
          onChange={(e) => update("steps", e.target.value)}
          rows={3}
          className={cn(fieldClass, "resize-none")}
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

/** Verde = tem em casa, vazio = falta, tracejado = ainda não está na despensa. */
export function StatusDot({ status }: { status: "in" | "out" | "new" }) {
  return (
    <span
      aria-hidden
      title={
        status === "in" ? "Tem em casa" : status === "out" ? "Falta em casa" : "Novo na despensa"
      }
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full border",
        status === "in" && "border-success bg-success",
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
      <Button onClick={() => setOpen(true)}>+ Nova receita</Button>
      {open && <RecipeFormModal pantry={pantry} onClose={() => setOpen(false)} />}
    </>
  );
}
