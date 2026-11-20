"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import {
  attentionBorder,
  AttentionBadge,
  type AttentionLevel,
  Badge,
  Button,
  Card,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  IconButton,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { BillAmountOverride } from "@/components/modules/financeiro/BillAmountOverride";
import { api, errorMessage } from "@/lib/client-api";
import {
  cn,
  formatDateBR,
  toDateInputValue,
  todayInputValue,
} from "@/lib/utils";
import {
  billStatusLabels,
  fixedBillTypeLabels,
  payMethodLabels,
} from "@/lib/labels";

const typeOptions = Object.keys(fixedBillTypeLabels);
const payMethodOptions = Object.keys(payMethodLabels);

type BillItem = {
  logId: string;
  fixedBillId: string;
  name: string;
  /** Valor que vale neste mês: o ajuste do mês, ou o padrão da conta. */
  amount: number;
  defaultAmount: number;
  amountOverride: number | null;
  dueDate: string;
  type: string;
  paymentMethod: string;
  notes: string | null;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
};

/** A régua de atenção do app aplicada ao estado da conta. */
const statusLevel: Record<string, AttentionLevel> = {
  PAGO: "ok",
  PENDENTE: "neutro",
  ATRASADO: "atrasado",
};

function FixedBillForm({
  item,
  onClose,
}: {
  item?: BillItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: item?.name ?? "",
    // O formulário edita a conta, não o mês — por isso o valor padrão dela.
    amount: item ? String(item.defaultAmount) : "",
    dueDate: item ? toDateInputValue(item.dueDate) : todayInputValue(),
    type: item?.type ?? typeOptions[0],
    paymentMethod: item?.paymentMethod ?? "PIX_DEBITO",
    notes: item?.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount || !form.dueDate) return;
    setSaving(true);
    setError(null);
    // A conta se repete todo mês, então o que fica guardado é o dia da data escolhida.
    const dueDay = Number(form.dueDate.split("-")[2]);
    const payload = {
      name: form.name,
      amount: Number(form.amount),
      dueDay,
      type: form.type,
      paymentMethod: form.paymentMethod,
      notes: form.notes || null,
    };
    try {
      // Antes era um `fetch` sem checar a resposta: se o servidor recusasse,
      // o formulário fechava e dizia "Salvo" do mesmo jeito.
      if (item) await api.patch(`/api/fixed-bills/${item.fixedBillId}`, payload);
      else await api.post("/api/fixed-bills", payload);
      onClose();
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={item ? "Editar conta fixa" : "Nova conta fixa"}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
    >
      <Field label="Nome">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ex.: Aluguel"
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Vencimento (repete todo mês)">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Tipo">
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className={fieldClass}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {fixedBillTypeLabels[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Forma de pagamento">
          <select
            value={form.paymentMethod}
            onChange={(e) => update("paymentMethod", e.target.value)}
            className={fieldClass}
          >
            {payMethodOptions.map((p) => (
              <option key={p} value={p}>
                {payMethodLabels[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {form.paymentMethod === "CARTAO_CREDITO" && (
        <p className="text-xs text-text-secondary">
          Entra sozinha na fatura do cartão todo mês — não lance ela de novo na
          tela do cartão.
        </p>
      )}
      <Field label="Notas (opcional)">
        <input
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={fieldClass}
        />
      </Field>
      <ErrorNote message={error} />
      <ModalActions>
        <Button
          type="submit"
          disabled={saving || !form.name.trim() || !form.amount || !form.dueDate}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function FixedBillList({ items: initialItems }: { items: BillItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const editingItem = items.find((i) => i.fixedBillId === editingId) ?? null;

  async function toggle(logId: string) {
    const item = items.find((i) => i.logId === logId);
    // Conta no cartão é paga junto da fatura, não uma a uma.
    if (!item || item.paymentMethod === "CARTAO_CREDITO") return;

    const previous = items;
    const nextStatus = item.status === "PAGO" ? "PENDENTE" : "PAGO";

    setError(null);
    setItems((prev) =>
      prev.map((i) => (i.logId === logId ? { ...i, status: nextStatus } : i)),
    );

    try {
      // Ao desmarcar, o servidor decide entre PENDENTE e ATRASADO.
      const log = await api.patch<BillItem>(`/api/fixed-bill-logs/${logId}`, {
        status: nextStatus,
      });
      setItems((prev) =>
        prev.map((i) => (i.logId === logId ? { ...i, status: log.status } : i)),
      );
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  async function handleDelete(fixedBillId: string) {
    const confirmed = await confirmAction({
      title: "Tem certeza que quer deletar esta conta fixa?",
      description: "Esta ação não pode ser desfeita.",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(fixedBillId);
    setError(null);
    try {
      await api.delete(`/api/fixed-bills/${fixedBillId}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorNote message={error} />

      {items.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nenhuma conta fixa cadastrada.
        </p>
      )}

      {items.map((item) => {
        return (
          <Card
            key={item.logId}
            // A borda vermelha na lateral: numa lista de dez contas, o selo
            // "Atrasado" à direita só aparece depois de ler a linha inteira.
            // No celular a linha quebra em duas: nome em cima; status, valor e
            // ações embaixo. Numa linha só passava 85px da tela de 375.
            className={cn(
              "group flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
              attentionBorder[statusLevel[item.status] ?? "neutro"],
            )}
          >
            {(() => {
              const onCard = item.paymentMethod === "CARTAO_CREDITO";
              const content = (
                <>
                  {item.status === "PAGO" ? (
                    <CheckCircle2 size={18} className="text-accent" />
                  ) : (
                    <Circle size={18} className="text-text-secondary" />
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                      {item.name}
                      {onCard && (
                        <Badge className="bg-badge-tarot-bg text-badge-tarot-text">
                          Cartão
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {fixedBillTypeLabels[item.type]} · vence em{" "}
                      {formatDateBR(new Date(item.dueDate))}
                      {onCard && " · paga com a fatura"}
                    </p>
                  </div>
                </>
              );

              // Assinatura no cartão não se marca sozinha: quem paga é a fatura.
              return onCard ? (
                <div
                  title="Essa conta é paga junto com a fatura do cartão."
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  {content}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(item.logId)}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  {content}
                </button>
              );
            })()}
            {/* pl-[30px]: alinha com o nome, depois do círculo de marcar. */}
            <div className="flex shrink-0 items-center gap-3 pl-[30px] sm:pl-0">
              <AttentionBadge
                level={statusLevel[item.status] ?? "neutro"}
                className="px-2.5 text-xs"
              >
                {billStatusLabels[item.status]}
              </AttentionBadge>
              <BillAmountOverride
                logId={item.logId}
                amount={item.amount}
                defaultAmount={item.defaultAmount}
                amountOverride={item.amountOverride}
              />
              <div className="flex items-center gap-1">
                <IconButton
                  title="Editar"
                  revealOnHover
                  onClick={() => setEditingId(item.fixedBillId)}
                >
                  <Pencil size={15} />
                </IconButton>
                <IconButton
                  title="Deletar"
                  onClick={() => handleDelete(item.fixedBillId)}
                  disabled={deletingId === item.fixedBillId}
                  tone="danger"
                  revealOnHover
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
          </Card>
        );
      })}

      <Button
        variant="secondary"
        className="self-start"
        onClick={() => setCreating(true)}
      >
        + Nova conta fixa
      </Button>
      {creating && <FixedBillForm onClose={() => setCreating(false)} />}
      {editingItem && (
        <FixedBillForm item={editingItem} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}
