"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  confirmAction,
  ErrorNote,
  IconButton,
  InlineEdit,
  fieldClass,
  notify,
} from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type PantryRow = {
  id: string;
  name: string;
  inStock: boolean;
  notes: string | null;
  /** Títulos das receitas que usam o item. */
  recipes: string[];
};

/**
 * A despensa: tudo que alguma receita usa (ou que ela cadastrou à mão), com
 * um único fato por item — tem em casa ou não. É esse fato que alimenta o
 * "dá pra fazer" das receitas e a lista de compras da semana.
 */
export function PantryList({ ingredients }: { ingredients: PantryRow[] }) {
  const router = useRouter();
  const { items, error, update } = useOptimisticList(ingredients);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function toggle(item: PantryRow) {
    const inStock = !item.inStock;
    update(item.id, { inStock }, () => api.patch(`/api/ingredients/${item.id}`, { inStock }));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/api/ingredients", { name });
      setNewName("");
      router.refresh();
      notify("Adicionado.");
    } catch (e) {
      setAddError(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function remove(item: PantryRow) {
    const confirmed = await confirmAction({
      title:
        item.recipes.length > 0
          ? `"${item.name}" é usado em ${item.recipes.length} receita(s). Ao excluir, ele some da lista de ingredientes delas. Excluir mesmo assim?`
          : `Excluir "${item.name}" da despensa?`,
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/ingredients/${item.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setAddError(errorMessage(e));
    }
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? items.filter((item) => item.name.toLowerCase().includes(term))
    : items;
  const missing = visible.filter((item) => !item.inStock);
  const inStock = visible.filter((item) => item.inStock);

  function renderRow(item: PantryRow) {
    return (
      <li
        key={item.id}
        className="group flex items-center gap-2 border-b border-border py-1 last:border-b-0"
      >
        <label className="flex min-h-11 items-center px-1">
          <input
            type="checkbox"
            checked={item.inStock}
            onChange={() => toggle(item)}
            aria-label={`${item.name}: tem em casa`}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <div className="flex min-w-0 flex-1 flex-col">
          <InlineEdit
            value={item.name}
            ariaLabel="Nome do ingrediente"
            onSave={async (name) => {
              await api.patch(`/api/ingredients/${item.id}`, { name });
              router.refresh();
            }}
            className={cn(
              "text-sm",
              item.inStock ? "text-text-secondary" : "text-text-primary",
            )}
          />
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-secondary">
            {item.recipes.length > 0 && (
              <span title={item.recipes.join(", ")}>
                {item.recipes.length} receita{item.recipes.length > 1 ? "s" : ""}
              </span>
            )}
            <InlineEdit
              value={item.notes ?? ""}
              placeholder="+ nota"
              ariaLabel="Nota do ingrediente"
              onSave={async (notes) => {
                await api.patch(`/api/ingredients/${item.id}`, { notes });
                router.refresh();
              }}
              className="text-[11px] text-text-secondary"
            />
          </div>
        </div>
        <IconButton
          title="Excluir"
          tone="danger"
          revealOnHover
          onClick={() => remove(item)}
        >
          <Trash2 size={15} />
        </IconButton>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <CardTitle>Adicionar à despensa</CardTitle>
        <ErrorNote message={addError} />
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Ex.: Ovo, Arroz, Azeite"
            className={fieldClass}
          />
          <Button onClick={add} disabled={adding || !newName.trim()}>
            Adicionar
          </Button>
        </div>
        <p className="text-[11px] text-text-secondary">
          Ingrediente novo de receita também aparece aqui sozinho.
        </p>
      </Card>

      <ErrorNote message={error} />

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          A despensa está vazia. Cadastre ingredientes nas receitas ou aqui em cima.
        </p>
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ingrediente"
            aria-label="Buscar ingrediente"
            className={fieldClass}
          />

          <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
            <Card className="flex flex-col gap-1">
              <CardTitle>
                Falta comprar
                <span className="ml-2 font-normal text-text-secondary">{missing.length}</span>
              </CardTitle>
              {missing.length === 0 ? (
                <p className="text-sm text-text-secondary">Nada faltando.</p>
              ) : (
                <ul className="flex flex-col">{missing.map(renderRow)}</ul>
              )}
            </Card>

            <Card className="flex flex-col gap-1">
              <CardTitle>
                Tem em casa
                <span className="ml-2 font-normal text-text-secondary">{inStock.length}</span>
              </CardTitle>
              {inStock.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Marque a caixinha do que você tem.
                </p>
              ) : (
                <ul className="flex flex-col">{inStock.map(renderRow)}</ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
