"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2, Undo2 } from "lucide-react";
import {
  Badge,
  BusinessBadge,
  Button,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { WishlistForm, type WishlistItemInput } from "./WishlistForm";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL, formatDateBR, todayInputValue } from "@/lib/utils";
import { wishCategoryLabels, wishPriorityLabels } from "@/lib/labels";

type Business = { id: string; name: string; color: string };

export type WishlistItem = WishlistItemInput & {
  status: string;
  boughtAt: string | null;
  boughtPrice: number | null;
  business: Business | null;
};

const priorityStyles: Record<string, string> = {
  ESSENCIAL: "bg-badge-ace-bg text-badge-ace-text",
  QUERO: "bg-badge-tarot-bg text-badge-tarot-text",
  ALGUM_DIA: "bg-badge-casa-bg text-badge-casa-text",
};

function BuyPanel({
  item,
  onClose,
}: {
  item: WishlistItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    boughtPrice: item.price != null ? String(item.price) : "",
    boughtAt: todayInputValue(),
    createTransaction: true,
  });

  async function confirmPurchase() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/wishlist/${item.id}/comprado`, {
        boughtPrice: form.boughtPrice ? Number(form.boughtPrice) : undefined,
        boughtAt: form.boughtAt,
        createTransaction: form.createTransaction,
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">Quanto custou</span>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={form.boughtPrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, boughtPrice: e.target.value }))
            }
            className="rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">Quando</span>
          <input
            type="date"
            value={form.boughtAt}
            onChange={(e) => setForm((p) => ({ ...p, boughtAt: e.target.value }))}
            className="rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs text-text-primary">
        <input
          type="checkbox"
          checked={form.createTransaction}
          onChange={(e) =>
            setForm((p) => ({ ...p, createTransaction: e.target.checked }))
          }
          className="mt-0.5"
        />
        <span>
          Lançar como saída no financeiro
          <span className="block text-text-secondary">
            Vira uma transação solta — apagar o desejo depois não apaga o gasto.
          </span>
        </span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmPurchase}
          disabled={saving}
          className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Confirmar compra
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function WishlistCard({
  item,
  businesses,
}: {
  item: WishlistItem;
  businesses: Business[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comprado = item.status === "COMPRADO";
  const descartado = item.status === "DESCARTADO";

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/wishlist/${item.id}`, { status });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Deletar "${item.name}" da lista?`,
      description: `Esta ação não pode ser desfeita.`,
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/wishlist/${item.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <WishlistForm
        businesses={businesses}
        item={item}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className={cn("flex flex-col gap-2", descartado && "opacity-60")}>
      <ErrorNote message={error} />

      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-sm font-medium text-text-primary",
            (comprado || descartado) && "line-through",
          )}
        >
          {item.name}
        </p>
        {item.price != null && (
          <span className="shrink-0 text-sm font-semibold text-text-primary">
            {formatCurrencyBRL(item.price)}
          </span>
        )}
      </div>

      {item.description && (
        <p className="text-xs text-text-secondary">{item.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <BusinessBadge business={item.business} />
        <Badge>{wishCategoryLabels[item.category]}</Badge>
        {!comprado && !descartado && (
          <Badge className={priorityStyles[item.priority]}>
            {wishPriorityLabels[item.priority]}
          </Badge>
        )}
        {comprado && (
          <Badge className="bg-emerald-500/10 text-emerald-600">
            Comprado
            {item.boughtPrice != null &&
              ` · ${formatCurrencyBRL(item.boughtPrice)}`}
          </Badge>
        )}
        {descartado && <Badge>Descartado</Badge>}
      </div>

      {item.targetDate && !comprado && (
        <p className="text-xs text-text-secondary">
          quer ter até {formatDateBR(new Date(item.targetDate))}
        </p>
      )}
      {comprado && item.boughtAt && (
        <p className="text-xs text-text-secondary">
          comprado em {formatDateBR(new Date(item.boughtAt))}
        </p>
      )}
      {item.notes && (
        <p className="text-xs text-text-secondary">{item.notes}</p>
      )}

      {buying ? (
        <BuyPanel item={item} onClose={() => setBuying(false)} />
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {comprado || descartado ? (
              <button
                type="button"
                onClick={() => setStatus("DESEJADO")}
                disabled={busy}
                title="Voltar para a lista"
                className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                <Undo2 size={13} /> voltar pra lista
              </button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setBuying(true)}
                  disabled={busy}
                >
                  Comprei
                </Button>
                <button
                  type="button"
                  onClick={() => setStatus("DESCARTADO")}
                  disabled={busy}
                  className="text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  descartar
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir link"
                className="text-text-secondary hover:text-text-primary"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <IconButton
              title="Editar"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} />
            </IconButton>
            <IconButton
              title="Deletar"
              onClick={handleDelete}
              disabled={busy}
              tone="danger"
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>
      )}
    </Card>
  );
}
