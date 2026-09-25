"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { prospectOpenStages, prospectStageLabels, leadSourceLabels } from "@/lib/labels";
import { toDateInputValue } from "@/lib/utils";
import type { ProspectOverview } from "@/lib/ace-shared";

const sourceOptions = Object.keys(leadSourceLabels);

function dateInputValue(value: string | null) {
  return value ? toDateInputValue(value) : "";
}

export function ProspectModal({
  prospect,
  onClose,
}: {
  prospect: ProspectOverview;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [losing, setLosing] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    stage: prospect.stage,
    source: prospect.source ?? "",
    nextFollowUpAt: dateInputValue(prospect.nextFollowUpAt),
    lastContactAt: dateInputValue(prospect.lastContactAt),
    proposalValue: prospect.proposalValue != null ? String(prospect.proposalValue) : "",
    notes: prospect.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function patch(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/client-business/${prospect.linkId}`, payload);
      router.refresh();
      notify(successMessage);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    await patch(
      {
        prospectStage: form.stage,
        source: form.source || null,
        nextFollowUpAt: form.nextFollowUpAt || null,
        lastContactAt: form.lastContactAt || null,
        proposalValue: form.proposalValue === "" ? null : Number(form.proposalValue),
        notes: form.notes || null,
      },
      "Salvo.",
    );
  }

  async function handleWin() {
    const confirmed = await confirmAction({
      title: "Marcar como ganho?",
      description: `${prospect.name} vira cliente ativo neste negócio.`,
    });
    if (!confirmed) return;
    await patch({ status: "ATIVO", prospectStage: "GANHO" }, "Virou cliente. 🎉");
  }

  async function handleConfirmLoss() {
    await patch(
      { status: "INATIVO", prospectStage: "PERDIDO", lostReason: lostReason || null },
      "Marcado como perdido.",
    );
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: "Excluir este prospect?",
      description: "Remove o vínculo com este negócio. O cadastro do cliente continua existindo.",
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/client-business/${prospect.linkId}`);
      router.refresh();
      notify("Excluído.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={prospect.name} size="md" onClose={onClose} onSubmit={handleSubmit}>
      <Link
        href={`/clientes/${prospect.clientId}`}
        className="-mt-1 self-start text-xs font-medium text-accent"
      >
        Ver cadastro do cliente
      </Link>

      <Field label="Etapa">
        <select
          value={form.stage}
          onChange={(e) => update("stage", e.target.value)}
          className={fieldClass}
        >
          {prospectOpenStages.map((s) => (
            <option key={s} value={s}>
              {prospectStageLabels[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Origem">
        <select
          value={form.source}
          onChange={(e) => update("source", e.target.value)}
          className={fieldClass}
        >
          <option value="">Não informada</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>
              {leadSourceLabels[s]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Próximo follow-up">
          <input
            type="date"
            value={form.nextFollowUpAt}
            onChange={(e) => update("nextFollowUpAt", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Último contato">
          <input
            type="date"
            value={form.lastContactAt}
            onChange={(e) => update("lastContactAt", e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="Valor da proposta (R$)">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={form.proposalValue}
          onChange={(e) => update("proposalValue", e.target.value)}
          className={fieldClass}
        />
      </Field>

      <Field label="Notas">
        <textarea
          placeholder="Conversa, objeção, combinado…"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className={fieldClass}
        />
      </Field>

      <ErrorNote message={error} />

      {losing ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-hover p-3">
          <p className="text-xs font-medium text-text-secondary">Motivo da perda (opcional)</p>
          <textarea
            placeholder='Ex.: "achou caro", "escolheu outra agência", sumiu…'
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            rows={2}
            className={fieldClass}
          />
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleConfirmLoss} disabled={saving}>
              Confirmar perda
            </Button>
            <Button variant="ghost" onClick={() => setLosing(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ModalActions>
            <Button type="submit" disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </ModalActions>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleWin} disabled={saving}>
                Marcar como ganho
              </Button>
              <Button variant="secondary" onClick={() => setLosing(true)} disabled={saving}>
                Marcar como perdido
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={saving}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
