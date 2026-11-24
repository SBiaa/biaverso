"use client";

import { useState } from "react";
import { Button, ErrorNote, Field, Modal, ModalActions, fieldClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { parseGoalAmount } from "@/lib/vision-shared";
import type { BrainstormItemDTO } from "./brainstorm-shared";

export type ConceptualChoice = { id: string; title: string; pillarId: string; pillarName: string };

const NEW = "__novo__";

/**
 * Transforma um item em Foco num objetivo metrificado, ou só num objetivo
 * conceitual (a meta com número fica para depois). O objetivo conceitual pode
 * ser um que já existe ou um novo, criado no pilar do item.
 */
export function BrainstormGoalModal({
  item,
  year,
  pillar,
  conceptualGoals,
  onClose,
  onCreated,
}: {
  item: BrainstormItemDTO;
  year: number;
  pillar: { id: string; name: string } | null;
  conceptualGoals: ConceptualChoice[];
  onClose: () => void;
  onCreated: (item: BrainstormItemDTO) => void;
}) {
  // Com pilar, só os objetivos dele; sem pilar, todos (com o nome do pilar ao lado).
  const choices = pillar ? conceptualGoals.filter((c) => c.pillarId === pillar.id) : conceptualGoals;

  const [onlyConceptual, setOnlyConceptual] = useState(false);
  const [form, setForm] = useState({
    title: item.text,
    conceptual: choices[0]?.id ?? (pillar ? NEW : ""),
    // Só o objetivo: o próprio rascunho costuma ser o nome dele.
    newConceptualTitle: choices.length === 0 ? item.text : "",
    targetValue: "",
    unit: "",
    deadline: `${year}-12-31`,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    if (!onlyConceptual && !form.title.trim()) return;
    const targetValue = parseGoalAmount(form.targetValue);
    if (targetValue === undefined) {
      setError("Valor inválido. Use algo como 1800, 1.800 ou 7k.");
      return;
    }
    const creatingConceptual = form.conceptual === NEW;
    if (creatingConceptual && !form.newConceptualTitle.trim()) {
      setError("Dê um nome ao objetivo conceitual novo.");
      return;
    }
    if (!form.conceptual) {
      setError("Escolha um objetivo conceitual.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await api.post<BrainstormItemDTO>(`/api/brainstorm-items/${item.id}/goal`, {
        title: form.title.trim() || item.text,
        onlyConceptual,
        ...(creatingConceptual
          ? { newConceptualTitle: form.newConceptualTitle }
          : { conceptualGoalId: form.conceptual }),
        targetValue,
        unit: form.unit,
        deadline: form.deadline || null,
      });
      onCreated(updated);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={onlyConceptual ? "Virar objetivo" : "Virar meta"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="flex gap-2" role="group" aria-label="O que o rascunho vira">
        {(
          [
            [false, "Objetivo com meta", "com número e prazo"],
            [true, "Só o objetivo", "o número fica para depois"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={label}
            type="button"
            aria-pressed={onlyConceptual === value}
            onClick={() => {
              setOnlyConceptual(value);
              // Só o objetivo, sem nenhum no pilar: já sugere criar um com o nome do rascunho.
              if (value && pillar && !form.newConceptualTitle) set("newConceptualTitle", item.text);
            }}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5 text-left text-sm",
              onlyConceptual === value
                ? "border-accent bg-accent/10 text-text-primary"
                : "border-border text-text-secondary",
            )}
          >
            <span className="block font-medium">{label}</span>
            <span className="block text-xs text-text-secondary">{hint}</span>
          </button>
        ))}
      </div>

      {!onlyConceptual && (
        <Field label="Meta">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={fieldClass}
          />
        </Field>
      )}

      <Field label="Objetivo conceitual (o porquê)">
        <select
          value={form.conceptual}
          onChange={(e) => set("conceptual", e.target.value)}
          className={fieldClass}
        >
          {!pillar && choices.length === 0 && <option value="">Nenhum objetivo ainda</option>}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {pillar ? c.title : `${c.title} · ${c.pillarName}`}
            </option>
          ))}
          {pillar && <option value={NEW}>+ Novo objetivo em {pillar.name}</option>}
        </select>
      </Field>
      {form.conceptual === NEW && (
        <input
          value={form.newConceptualTitle}
          onChange={(e) => set("newConceptualTitle", e.target.value)}
          placeholder="Ex.: Fazer a ACE crescer"
          aria-label="Nome do objetivo conceitual novo"
          className={fieldClass}
        />
      )}
      {!pillar && (
        <p className="text-xs text-text-secondary">
          Para criar um objetivo conceitual novo, escolha antes o pilar do item.
        </p>
      )}

      {!onlyConceptual && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Quanto">
              <input
                value={form.targetValue}
                onChange={(e) => set("targetValue", e.target.value)}
                placeholder="Ex.: 12k"
                className={fieldClass}
              />
            </Field>
            <Field label="Unidade">
              <input
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="R$, kg…"
                className={fieldClass}
              />
            </Field>
            <Field label="Prazo">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
          <p className="text-xs text-text-secondary">
            Número e unidade são opcionais: dá para completar depois na Central de Visão.
          </p>
        </>
      )}

      <ErrorNote message={error} />

      <ModalActions>
        <Button type="submit" disabled={saving}>
          {onlyConceptual ? "Criar objetivo" : "Criar meta"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}
