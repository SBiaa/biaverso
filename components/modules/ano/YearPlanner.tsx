"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Card, notify, SaveStatus, useSaveStatus, fieldClass } from "@/components/ui";
import { PlanejarTabs } from "@/components/modules/planejar/PlanejarTabs";
import { api, errorMessage } from "@/lib/client-api";

export type YearPlanData = {
  word: string;
  retro: { deuCerto?: string; naoDeuCerto?: string; aprendi?: string };
  pillarNotes: Record<string, string>;
  dates: { id: string; date: string; title: string }[];
  incomeTarget: number | null;
  savingsTarget: number | null;
  budgetNotes: string;
};

type PillarGoal = { id: string; title: string; status: string; deadline: string };
type PillarInfo = { id: string; name: string; color: string; goals: PillarGoal[] };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const RETRO_FIELDS = [
  ["deuCerto", "O que deu certo"],
  ["naoDeuCerto", "O que não deu"],
  ["aprendi", "O que aprendi"],
] as const;

const BUDGET_FIELDS = [
  ["incomeTarget", "Quero ganhar (R$)"],
  ["savingsTarget", "Quero guardar (R$)"],
] as const;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Tudo salva sozinho ao sair do campo: digita-se no estado local e, no blur,
 * o plano inteiro vai pro servidor (só se mudou desde a última gravação).
 */
export function YearPlanner({
  year,
  initial,
  pillars,
}: {
  year: number;
  initial: YearPlanData;
  pillars: PillarInfo[];
}) {
  const [plan, setPlan] = useState(initial);
  const { state: saveState, track } = useSaveStatus();
  const saved = useRef(JSON.stringify(initial));

  async function save(next: YearPlanData = plan) {
    if (next !== plan) setPlan(next);
    const snapshot = JSON.stringify(next);
    if (snapshot === saved.current) return;
    try {
      await track(api.patch(`/api/year-plan/${year}`, {
        ...next,
        word: next.word.trim() || null,
        budgetNotes: next.budgetNotes.trim() || null,
        // Datas sem descrição ainda não contam.
        dates: next.dates.filter((d) => d.title.trim()),
      }));
      saved.current = snapshot;
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  }

  const sortedDates = [...plan.dates].sort((a, b) => a.date.localeCompare(b.date));
  const setDate = (id: string, patch: Partial<YearPlanData["dates"][number]>) => ({
    ...plan,
    dates: plan.dates.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  });

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8">
      <PlanejarTabs />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={`/ano?ano=${year - 1}`}
            aria-label="Ano anterior"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-hover"
          >
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold text-text-primary">{year}</h1>
          <Link
            href={`/ano?ano=${year + 1}`}
            aria-label="Próximo ano"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-hover"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
        <SaveStatus state={saveState} />
      </div>

      {/* Palavra do ano */}
      <Card className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Palavra do ano
        </p>
        <input
          value={plan.word}
          onChange={(e) => setPlan({ ...plan, word: e.target.value })}
          onBlur={() => save()}
          placeholder="Ex.: constância"
          aria-label="Palavra do ano"
          className="mt-1 w-full bg-transparent text-center text-3xl font-semibold text-accent-ink outline-none placeholder:text-text-secondary/40"
        />
      </Card>

      {/* Retrospectiva */}
      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Olhando pra {year - 1}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {RETRO_FIELDS.map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-sm font-medium text-text-secondary">{label}</span>
              <textarea
                rows={5}
                value={plan.retro[key] ?? ""}
                onChange={(e) =>
                  setPlan({ ...plan, retro: { ...plan.retro, [key]: e.target.value } })
                }
                onBlur={() => save()}
                className={fieldClass}
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Por pilar */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">
          O que quero conquistar, por pilar
        </h2>
        {pillars.length === 0 && (
          <Card className="text-sm text-text-secondary">
            Nenhum pilar ativo ainda. Crie seus pilares na{" "}
            <Link href="/visao" className="text-accent-ink underline">
              Central de Visão
            </Link>
            .
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {pillars.map((p) => (
            <Card key={p.id} className="space-y-3" style={{ borderTop: `3px solid ${p.color}` }}>
              <Link
                href={`/visao/${p.id}`}
                className="font-semibold text-text-primary hover:underline"
              >
                {p.name}
              </Link>
              <textarea
                rows={4}
                placeholder={`Em ${year}, nesse pilar eu quero…`}
                aria-label={`Intenção para ${p.name}`}
                value={plan.pillarNotes[p.id] ?? ""}
                onChange={(e) =>
                  setPlan({ ...plan, pillarNotes: { ...plan.pillarNotes, [p.id]: e.target.value } })
                }
                onBlur={() => save()}
                className={fieldClass}
              />
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-secondary">
                  Metas com prazo em {year}
                </p>
                {p.goals.length === 0 ? (
                  <p className="text-xs text-text-secondary/70">
                    Nenhuma ainda — crie em{" "}
                    <Link href="/visao?tab=metrificados" className="underline">
                      objetivos metrificados
                    </Link>{" "}
                    com prazo em {year}.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {p.goals.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                        <span
                          className={
                            g.status === "CONCLUIDO"
                              ? "text-text-secondary line-through"
                              : "text-text-primary"
                          }
                        >
                          {g.title}
                        </span>
                        <span className="shrink-0 text-xs text-text-secondary">
                          {MONTHS[new Date(g.deadline).getUTCMonth()]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Datas importantes */}
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Datas importantes</h2>
          {sortedDates.length > 0 && (
            <ul className="space-y-2">
              {sortedDates.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={d.date}
                    min={`${year}-01-01`}
                    max={`${year}-12-31`}
                    aria-label="Data"
                    onChange={(e) => e.target.value && save(setDate(d.id, { date: e.target.value }))}
                    className={`${fieldClass} w-36 shrink-0`}
                  />
                  <input
                    value={d.title}
                    placeholder="Viagem, lançamento, aniversário…"
                    aria-label="Descrição da data"
                    onChange={(e) => setPlan(setDate(d.id, { title: e.target.value }))}
                    onBlur={() => save()}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    aria-label="Remover data"
                    onClick={() => save({ ...plan, dates: plan.dates.filter((x) => x.id !== d.id) })}
                    className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-hover hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() =>
              setPlan({
                ...plan,
                dates: [...plan.dates, { id: crypto.randomUUID(), date: `${year}-01-01`, title: "" }],
              })
            }
            className="flex items-center gap-1.5 text-sm font-medium text-accent-ink"
          >
            <Plus size={16} /> Adicionar data
          </button>
        </Card>

        {/* Orçamento */}
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Orçamento do ano</h2>
          <div className="grid grid-cols-2 gap-3">
            {BUDGET_FIELDS.map(([key, label]) => {
              const value = plan[key];
              return (
                <label key={key} className="space-y-1">
                  <span className="text-sm font-medium text-text-secondary">{label}</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    inputMode="decimal"
                    value={value ?? ""}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        [key]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => save()}
                    className={fieldClass}
                  />
                  {value ? (
                    <span className="text-xs text-text-secondary">≈ {brl(value / 12)} por mês</span>
                  ) : null}
                </label>
              );
            })}
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-text-secondary">
              Notas (gastos grandes, investimentos…)
            </span>
            <textarea
              rows={3}
              value={plan.budgetNotes}
              onChange={(e) => setPlan({ ...plan, budgetNotes: e.target.value })}
              onBlur={() => save()}
              className={fieldClass}
            />
          </label>
        </Card>
      </div>
    </main>
  );
}
