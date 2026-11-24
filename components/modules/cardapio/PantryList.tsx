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
import { ingredientKindGroupLabels, ingredientKindLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PantryRow = {
  id: string;
  name: string;
  inStock: boolean;
  kind: string;
  alwaysHave: boolean;
  notes: string | null;
  /** Títulos dos pratos que usam o item. */
  recipes: string[];
};

const kindOrder = Object.keys(ingredientKindLabels);

type Tab = "falta" | "tem" | "todos" | "sem-tipo";

const atHome = (item: PantryRow) => item.inStock || item.alwaysHave;

/**
 * A despensa: tudo que algum prato usa (ou que ela cadastrou à mão), agrupado
 * por tipo. Cada item diz se tem em casa; os básicos ("sempre tenho": sal,
 * óleo) nunca contam como faltando. O tipo é o que ensina ao sorteio o que é
 * proteína, para não repetir frango no almoço e na janta.
 */
export function PantryList({ ingredients }: { ingredients: PantryRow[] }) {
  const router = useRouter();
  const { items, error, update } = useOptimisticList(ingredients);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("todos");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("OUTRO");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function patch(item: PantryRow, data: Partial<Pick<PantryRow, "inStock" | "kind" | "alwaysHave">>) {
    update(item.id, data, () => api.patch(`/api/ingredients/${item.id}`, data));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/api/ingredients", { name, kind: newKind, inStock: true });
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
          ? `"${item.name}" é usado em ${item.recipes.length} prato(s). Ao excluir, ele some da lista deles. Excluir mesmo assim?`
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

  const untyped = items.filter((item) => item.kind === "OUTRO").length;
  const counts: Record<Tab, number> = {
    falta: items.filter((item) => !atHome(item)).length,
    tem: items.filter(atHome).length,
    todos: items.length,
    "sem-tipo": untyped,
  };
  const tabs: { key: Tab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "falta", label: "Falta" },
    { key: "tem", label: "Tem em casa" },
    ...(untyped > 0 ? [{ key: "sem-tipo" as const, label: "Sem tipo" }] : []),
  ];
  const activeTab = tab === "sem-tipo" && untyped === 0 ? "todos" : tab;

  const term = search.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (!term || item.name.toLowerCase().includes(term)) &&
      (activeTab === "todos" ||
        (activeTab === "falta" && !atHome(item)) ||
        (activeTab === "tem" && atHome(item)) ||
        (activeTab === "sem-tipo" && item.kind === "OUTRO")),
  );
  const groups = kindOrder
    .map((kind) => ({ kind, items: visible.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length > 0);

  function renderRow(item: PantryRow) {
    return (
      <li
        key={item.id}
        className="group flex items-start gap-2 border-b border-border py-1.5 last:border-b-0"
      >
        <label className="flex min-h-11 items-center px-1">
          <input
            type="checkbox"
            checked={atHome(item)}
            disabled={item.alwaysHave}
            onChange={() => patch(item, { inStock: !item.inStock })}
            aria-label={`${item.name}: tem em casa`}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
          <InlineEdit
            value={item.name}
            ariaLabel="Nome do ingrediente"
            onSave={async (name) => {
              await api.patch(`/api/ingredients/${item.id}`, { name });
              router.refresh();
            }}
            className={cn("text-sm", atHome(item) ? "text-text-secondary" : "text-text-primary")}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <select
              value={item.kind}
              onChange={(e) => patch(item, { kind: e.target.value })}
              aria-label={`Tipo de ${item.name}`}
              className={cn(
                "h-8 rounded-md border bg-surface px-1.5 text-xs",
                item.kind === "OUTRO"
                  ? "border-warning text-warning-soft-text"
                  : "border-border text-text-primary",
              )}
            >
              {kindOrder.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === "OUTRO" ? "Tipo?" : ingredientKindLabels[kind]}
                </option>
              ))}
            </select>
            <label className="flex min-h-8 cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={item.alwaysHave}
                onChange={() => patch(item, { alwaysHave: !item.alwaysHave })}
                className="h-3.5 w-3.5 accent-accent"
              />
              sempre tenho
            </label>
            {item.recipes.length > 0 && (
              <span title={item.recipes.join(", ")}>
                em {item.recipes.length} prato{item.recipes.length > 1 ? "s" : ""}
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
              className="text-xs text-text-secondary"
            />
          </div>
        </div>
        <IconButton title="Excluir" tone="danger" revealOnHover onClick={() => remove(item)}>
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
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_11rem_auto]">
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
            aria-label="Nome do ingrediente"
            className={cn(fieldClass, "col-span-2 sm:col-span-1")}
          />
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value)}
            aria-label="Tipo do ingrediente"
            className={fieldClass}
          >
            {kindOrder.map((kind) => (
              <option key={kind} value={kind}>
                {ingredientKindLabels[kind]}
              </option>
            ))}
          </select>
          <Button onClick={add} disabled={adding || !newName.trim()}>
            Adicionar
          </Button>
        </div>
        <p className="text-xs text-text-secondary">
          Entra como “tem em casa”. Ingrediente novo de prato também aparece aqui sozinho.
        </p>
      </Card>

      {untyped > 0 && activeTab !== "sem-tipo" && (
        <button
          type="button"
          onClick={() => setTab("sem-tipo")}
          className="rounded-lg border border-warning/40 bg-warning-soft-bg px-3 py-2 text-left text-sm text-warning-soft-text hover:opacity-90"
        >
          {untyped} ingrediente{untyped > 1 ? "s" : ""} sem tipo. Diga quais são proteína para o
          sorteio não repetir frango no almoço e na janta →
        </button>
      )}

      <ErrorNote message={error} />

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          A despensa está vazia. Cadastre ingredientes nos pratos ou aqui em cima.
        </p>
      ) : (
        <>
          <nav aria-label="Filtrar despensa" className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {tabs.map(({ key, label }) => {
              const active = key === activeTab;
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
                    active
                      ? "bg-accent/10 text-accent-ink"
                      : "text-text-secondary hover:bg-hover",
                  )}
                >
                  {label}
                  <span className="rounded-full bg-hover px-1.5 text-xs">{counts[key]}</span>
                </button>
              );
            })}
          </nav>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ingrediente"
            aria-label="Buscar ingrediente"
            className={fieldClass}
          />

          {groups.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {activeTab === "falta" ? "Nada faltando." : "Nenhum ingrediente aqui."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <Card key={group.kind} className="flex flex-col gap-1">
                  <CardTitle>
                    {ingredientKindGroupLabels[group.kind]}
                    <span className="ml-2 font-normal text-text-secondary">
                      {group.items.length}
                    </span>
                  </CardTitle>
                  <ul className="flex flex-col">{group.items.map(renderRow)}</ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
