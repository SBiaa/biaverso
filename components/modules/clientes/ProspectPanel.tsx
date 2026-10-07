"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, Trash2 } from "lucide-react";
import {
  BusinessBadge,
  Button,
  CardTitle,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api, errorMessage } from "@/lib/client-api";
import {
  prospectOpenStages,
  prospectStageLabels,
  leadSourceLabels,
} from "@/lib/labels";
import { cn, formatDateBR, toDateInputValue } from "@/lib/utils";

export type ProspectStep = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  completedAt: string | null;
};

export type ProspectNoteItem = {
  id: string;
  text: string;
  kind: string;
  createdAt: string;
};

export type ProspectLink = {
  id: string;
  stage: string | null;
  source: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  proposalValue: number | null;
  business: { name: string; color: string };
  steps: ProspectStep[];
  notes: ProspectNoteItem[];
};

const inputClass =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent";
const labelClass =
  "flex flex-col gap-1 text-xs font-medium text-text-secondary";

const dateValue = (iso: string | null) => (iso ? toDateInputValue(iso) : "");
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/** Acompanhamento de um prospect em UM negócio: situação, checklist e histórico. */
export function ProspectPanel({ link }: { link: ProspectLink }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [newStepDate, setNewStepDate] = useState("");
  const [noteText, setNoteText] = useState("");
  const {
    items: steps,
    error: stepError,
    update,
  } = useOptimisticList(link.steps);

  /** Roda a chamada e atualiza a tela; devolve se deu certo. */
  async function run(request: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await request();
      router.refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const patchLink = (payload: Record<string, unknown>) =>
    run(() => api.patch(`/api/client-business/${link.id}`, payload));

  async function addStep() {
    const title = newStep.trim();
    if (!title) return;
    const ok = await run(() =>
      api.post("/api/prospect-tasks", {
        clientBusinessId: link.id,
        title,
        dueDate: newStepDate || null,
      }),
    );
    if (ok) {
      setNewStep("");
      setNewStepDate("");
    }
  }

  async function addNote() {
    const text = noteText.trim();
    if (!text) return;
    const ok = await run(() =>
      api.post("/api/prospect-notes", { clientBusinessId: link.id, text }),
    );
    if (ok) setNoteText("");
  }

  const doneCount = steps.filter((s) => s.done).length;

  // Histórico: anotações, mudanças de etapa e passos concluídos, do mais novo ao mais velho.
  const feed = [
    ...link.notes.map((n) => ({
      id: n.id,
      at: n.createdAt,
      text: n.text,
      type: n.kind === "NOTA" ? ("note" as const) : ("event" as const),
      noteId: n.kind === "NOTA" ? n.id : null,
    })),
    ...link.steps.flatMap((s) =>
      s.done && s.completedAt
        ? [
            {
              id: `step-${s.id}`,
              at: s.completedAt,
              text: `Concluído: ${s.title}`,
              type: "event" as const,
              noteId: null,
            },
          ]
        : [],
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const today = toDateInputValue(new Date());

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Prospecção</CardTitle>
          <BusinessBadge business={link.business} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              patchLink({ status: "ATIVO", prospectStage: "GANHO" }).then(
                (ok) => ok && notify("Virou cliente. 🎉"),
              )
            }
          >
            Marcar como ganho
          </Button>
        </div>
      </div>

      {/* Situação */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <label className={labelClass}>
          Etapa
          <select
            value={link.stage ?? "NOVO_CONTATO"}
            onChange={(e) => patchLink({ prospectStage: e.target.value })}
            disabled={busy}
            className={inputClass}
          >
            {prospectOpenStages.map((s) => (
              <option key={s} value={s}>
                {prospectStageLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Último contato
          <input
            type="date"
            defaultValue={dateValue(link.lastContactAt)}
            key={link.lastContactAt ?? "none"}
            onBlur={(e) =>
              e.target.value !== dateValue(link.lastContactAt) &&
              patchLink({ lastContactAt: e.target.value || null })
            }
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Próximo follow-up
          <input
            type="date"
            defaultValue={dateValue(link.nextFollowUpAt)}
            key={link.nextFollowUpAt ?? "none-fu"}
            onBlur={(e) =>
              e.target.value !== dateValue(link.nextFollowUpAt) &&
              patchLink({ nextFollowUpAt: e.target.value || null })
            }
            className={cn(
              inputClass,
              link.nextFollowUpAt &&
                dateValue(link.nextFollowUpAt) < today &&
                "border-danger",
            )}
          />
        </label>
        <label className={labelClass}>
          Proposta (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            defaultValue={link.proposalValue ?? ""}
            key={link.proposalValue ?? "none-pv"}
            onBlur={(e) => {
              const value =
                e.target.value === "" ? null : Number(e.target.value);
              if (value !== link.proposalValue)
                patchLink({ proposalValue: value });
            }}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Origem
          <select
            value={link.source ?? ""}
            onChange={(e) => patchLink({ source: e.target.value || null })}
            disabled={busy}
            className={inputClass}
          >
            <option value="">Não informada</option>
            {Object.entries(leadSourceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Passos à esquerda; anotações e histórico à direita. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              Passos{" "}
              {steps.length > 0 && (
                <span className="font-normal text-text-secondary">
                  · {doneCount} de {steps.length}
                </span>
              )}
            </h3>
            <Button
              variant="ghost"
              disabled={busy}
              className="min-h-0 px-2 py-1 text-xs"
              onClick={() =>
                run(() =>
                  api.post("/api/prospect-tasks/defaults", {
                    clientBusinessId: link.id,
                  }),
                )
              }
            >
              <ListChecks size={14} />
              {steps.length === 0
                ? "Montar checklist padrão"
                : "Completar com passos padrão"}
            </Button>
          </div>

          {steps.length === 0 && (
            <p className="text-sm text-text-secondary">
              Nenhum passo ainda. Monte o checklist padrão ou crie os seus
              abaixo — os passos com data aparecem nas tarefas do dia.
            </p>
          )}

          <ul className="flex flex-col divide-y divide-border">
            {steps.map((step) => {
              const late =
                !step.done && step.dueDate && dateValue(step.dueDate) < today;
              return (
                <li
                  key={step.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      update(step.id, { done: !step.done }, () =>
                        api.patch(`/api/prospect-tasks/${step.id}`, {
                          done: !step.done,
                        }),
                      )
                    }
                    aria-label={
                      step.done
                        ? `Reabrir ${step.title}`
                        : `Concluir ${step.title}`
                    }
                    className="shrink-0"
                  >
                    {step.done ? (
                      <CheckCircle2 size={18} className="text-accent" />
                    ) : (
                      <Circle size={18} className="text-text-secondary" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-text-primary",
                      step.done && "text-text-secondary line-through",
                    )}
                  >
                    {step.title}
                  </span>
                  {step.done && step.completedAt ? (
                    <span className="text-xs text-text-secondary">
                      {formatDateBR(new Date(step.completedAt))}
                    </span>
                  ) : (
                    <input
                      type="date"
                      aria-label={`Prazo de ${step.title}`}
                      defaultValue={dateValue(step.dueDate)}
                      key={step.dueDate ?? "none"}
                      onBlur={(e) =>
                        e.target.value !== dateValue(step.dueDate) &&
                        run(() =>
                          api.patch(`/api/prospect-tasks/${step.id}`, {
                            dueDate: e.target.value || null,
                          }),
                        )
                      }
                      className={cn(
                        "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-text-secondary outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent",
                        late && "font-medium text-danger",
                      )}
                    />
                  )}
                  <IconButton
                    aria-label={`Excluir ${step.title}`}
                    onClick={() =>
                      run(() => api.delete(`/api/prospect-tasks/${step.id}`))
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStep()}
              placeholder="Novo passo (ex.: mandar o portfólio)"
              className={cn(inputClass, "min-w-0 flex-1")}
            />
            <input
              type="date"
              value={newStepDate}
              onChange={(e) => setNewStepDate(e.target.value)}
              aria-label="Prazo do novo passo"
              className={inputClass}
            />
            <Button
              variant="secondary"
              onClick={addStep}
              disabled={busy || !newStep.trim()}
            >
              Adicionar
            </Button>
          </div>
        </div>

        {/* Anotações e histórico */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            O que identifiquei
          </h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Ex.: perfil sem padrão visual, posta 1x por semana, dona responde rápido no WhatsApp…"
            className={cn(inputClass, "w-full")}
          />
          <div>
            <Button onClick={addNote} disabled={busy || !noteText.trim()}>
              Salvar anotação
            </Button>
          </div>

          {feed.length > 0 && (
            <ul className="mt-2 flex flex-col gap-3 border-l border-border pl-4">
              {feed.map((item) => (
                <li key={item.id} className="relative text-sm">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[21px] top-1.5 size-2 rounded-full",
                      item.type === "note" ? "bg-accent" : "bg-border",
                    )}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "whitespace-pre-wrap",
                        item.type === "note"
                          ? "text-text-primary"
                          : "text-text-secondary",
                      )}
                    >
                      {item.text}
                    </p>
                    {item.noteId && (
                      <IconButton
                        aria-label="Excluir anotação"
                        onClick={() =>
                          run(() =>
                            api.delete(`/api/prospect-notes/${item.noteId}`),
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary/80">
                    {dateTime(item.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ErrorNote message={error ?? stepError} />
    </section>
  );
}
