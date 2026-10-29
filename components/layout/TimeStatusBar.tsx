"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coffee, Play, SkipForward, Square } from "lucide-react";
import { notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDurationMinutes } from "@/lib/utils";
import {
  askNotificationPermission,
  beep,
  formatClock,
  loadBreak,
  loadDetails,
  saveBreak,
  saveDetails,
  systemNotify,
  type BreakState,
  type EntryDetails,
} from "@/lib/pomodoro";
import {
  summarizeDay,
  type PomodoroSettingsDTO,
  type TimeEntryDTO,
  type TimeStatusDTO,
} from "@/lib/time-tracking-shared";
import { EntryDetailsPanel } from "./time/EntryDetailsPanel";
import { PomodoroSettingsModal } from "./time/PomodoroSettingsModal";

/** Quem mexe em registros fora da barra (a tela de horas) avisa por aqui. */
export const TIME_STATUS_REFRESH_EVENT = "time-status:refresh";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const detailsOf = (entry: TimeEntryDTO): EntryDetails => ({
  categoryId: entry.categoryId,
  title: entry.title ?? "",
  description: entry.description ?? "",
  projectId: entry.projectId,
  taskId: entry.taskId,
});

export function TimeStatusBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<TimeStatusDTO | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // A pausa vive no navegador. A leitura no inicializador é segura contra
  // hidratação: até os dados chegarem a barra é só o esqueleto, igual nos dois.
  const [pause, setPause] = useState<BreakState | null>(() =>
    typeof window === "undefined" ? null : loadBreak(),
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Evita encerrar o mesmo ciclo duas vezes: o relógio bate a cada segundo e a
  // chamada ao servidor demora mais que isso.
  const handlingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setStatus(await api.get<TimeStatusDTO>("/api/time-status"));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  const changePause = useCallback((next: BreakState | null) => {
    setPause(next);
    saveBreak(next);
  }, []);

  // Recarrega ao trocar de tela, ao voltar para a aba e a cada minuto.
  useEffect(() => {
    const first = setTimeout(load, 0);
    const onVisible = () => document.visibilityState === "visible" && load();
    const id = setInterval(load, 60_000);
    window.addEventListener(TIME_STATUS_REFRESH_EVENT, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener(TIME_STATUS_REFRESH_EVENT, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, pathname]);

  const running = status?.running ?? null;
  const settings = status?.settings;

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Um tick já, para o relógio não ficar parado até o primeiro intervalo.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, running || pause ? 1000 : 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running, pause]);

  // Fecha o painel ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const refreshAll = useCallback(async () => {
    await load();
    // A tela de horas (linha do tempo, registros) lê do servidor.
    router.refresh();
  }, [load, router]);

  const startEntry = useCallback(
    async (details: EntryDetails, pomodoro: boolean) => {
      setSaving(true);
      try {
        await api.post("/api/time-entries/start", {
          categoryId: details.categoryId,
          title: details.title.trim() || null,
          description: details.description.trim() || null,
          projectId: details.projectId,
          taskId: details.taskId,
          pomodoro,
        });
        saveDetails(details);
        changePause(null);
        if (pomodoro) askNotificationPermission();
        setPanelOpen(false);
        await refreshAll();
      } catch (e) {
        notify(errorMessage(e), "error");
      } finally {
        setSaving(false);
      }
    },
    [changePause, refreshAll],
  );

  async function saveRunning(details: EntryDetails) {
    if (!running) return;
    setSaving(true);
    try {
      await api.patch(`/api/time-entries/${running.id}`, {
        categoryId: details.categoryId,
        title: details.title.trim() || null,
        description: details.description.trim() || null,
        projectId: details.projectId,
        taskId: details.taskId,
      });
      saveDetails(details);
      setPanelOpen(false);
      await refreshAll();
      notify("Salvo.");
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function stopRunning() {
    if (!running || saving) return;
    setSaving(true);
    try {
      await api.post(`/api/time-entries/${running.id}/stop`, {});
      changePause(null);
      setPanelOpen(false);
      await refreshAll();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function completeFocus(
    entry: TimeEntryDTO,
    focusEnd: number,
    config: PomodoroSettingsDTO,
    doneBefore: number,
  ) {
    try {
      await api.post(`/api/time-entries/${entry.id}/stop`, {
        endedAt: new Date(focusEnd).toISOString(),
      });
    } catch {
      // Já encerrado em outra aba: só atualiza.
      await load();
      return;
    }

    const kind = (doneBefore + 1) % config.cyclesBeforeLongBreak === 0 ? "long" : "short";
    const minutes = kind === "long" ? config.longBreakMinutes : config.shortBreakMinutes;
    const live = Date.now() - focusEnd < 60_000;
    const message = `Foco concluído. Pausa ${kind === "long" ? "longa" : "curta"} de ${minutes} min.`;

    if (live && config.sound) beep();
    if (live) systemNotify("Pomodoro concluído", message);
    notify(message);

    if (config.autoStartBreaks) {
      // A pausa conta desde o fim do foco: se a aba estava fechada, parte dela já passou.
      const endsAt = focusEnd + minutes * 60_000;
      if (endsAt > Date.now()) changePause({ kind, endsAt });
    }
    await refreshAll();
  }

  async function endBreak(config: PomodoroSettingsDTO) {
    changePause(null);
    if (config.sound) beep();
    systemNotify("A pausa acabou", "Hora de voltar ao foco.");
    const details = loadDetails();
    if (config.autoStartFocus && details) {
      await startEntry(details, true);
    } else {
      notify("A pausa acabou. Hora de voltar ao foco.");
    }
  }

  // O relógio do pomodoro: acaba o foco → registra com o fim exato e começa a
  // pausa; acaba a pausa → avisa (e recomeça, se ela pediu).
  useEffect(() => {
    if (!status || !settings || handlingRef.current) return;

    if (running?.pomodoro) {
      const focusEnd = new Date(running.startedAt).getTime() + settings.focusMinutes * 60_000;
      if (now >= focusEnd) {
        handlingRef.current = true;
        // O primeiro passo é a chamada ao servidor (assíncrona): nada de setState síncrono.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void completeFocus(running, focusEnd, settings, status.pomodorosToday).finally(() => {
          handlingRef.current = false;
        });
      }
      return;
    }

    if (!running && pause && now >= pause.endsAt) {
      handlingRef.current = true;
      void endBreak(settings).finally(() => {
        handlingRef.current = false;
      });
    }
    // As funções abaixo só leem refs/estado estável; o gatilho é o relógio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, status, running, pause, settings]);

  if (!status || !settings) {
    // Reserva o espaço para o título não pular quando os dados chegam.
    return <div className="h-8 w-40 shrink-0 animate-pulse rounded-md bg-border/50" aria-hidden />;
  }
  if (status.categories.length === 0 && !running) return null;

  const { trackedMinutes, untrackedMinutes } = summarizeDay(
    status.entries,
    status.windowStart,
    status.windowEnd,
    now,
  );

  const category = running ? status.categories.find((c) => c.id === running.categoryId) : null;
  const project = running?.projectId
    ? status.projects.find((p) => p.id === running.projectId)
    : null;
  const label =
    running?.title ||
    (running?.taskId ? status.taskTitles[running.taskId] : null) ||
    project?.name ||
    category?.name;

  const lastEntry = status.entries[status.entries.length - 1];
  const remembered = loadDetails();
  const idleDetails: EntryDetails = {
    categoryId:
      status.categories.find((c) => c.id === (remembered?.categoryId ?? lastEntry?.categoryId))
        ?.id ??
      status.categories[0]?.id ??
      "",
    title: "",
    description: "",
    // Quase sempre se retoma o mesmo projeto; título e descrição, não.
    projectId: status.projects.some((p) => p.id === remembered?.projectId)
      ? (remembered?.projectId ?? null)
      : null,
    taskId: null,
  };

  const focusRemaining = running?.pomodoro
    ? new Date(running.startedAt).getTime() + settings.focusMinutes * 60_000 - now
    : null;

  const pillClass =
    "flex h-8 min-w-0 items-center gap-2 rounded-md border border-border px-2.5 font-medium text-text-primary hover:bg-border/40";

  return (
    <div ref={wrapperRef} className="relative flex shrink-0 items-center gap-2 text-xs sm:gap-3">
      <Link
        href="/horas"
        title="Abrir o controle de horas"
        className="hidden items-center gap-3 rounded-md px-2 py-1 hover:bg-border/40 sm:flex"
      >
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-text-secondary">Hoje</span>
          <span className="font-semibold text-text-primary">
            {formatDurationMinutes(trackedMinutes)}
          </span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-text-secondary">
            Sem registro
          </span>
          <span
            className={cn(
              "font-semibold",
              untrackedMinutes >= 60 ? "text-amber-600" : "text-text-primary",
            )}
          >
            {formatDurationMinutes(untrackedMinutes)}
          </span>
        </span>
      </Link>

      {running ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            title="Editar o que está fazendo"
            className={pillClass}
          >
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full"
              style={{ backgroundColor: category?.color ?? "#6366F1" }}
            />
            <span className="font-mono tabular-nums">
              {focusRemaining !== null
                ? formatClock(focusRemaining)
                : formatElapsed(now - new Date(running.startedAt).getTime())}
            </span>
            {label && (
              <span className="hidden max-w-40 truncate font-normal text-text-secondary lg:inline">
                {label}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={stopRunning}
            disabled={saving}
            aria-label="Parar"
            title="Parar"
            className="flex size-8 items-center justify-center rounded-md border border-border text-text-primary hover:bg-border/40 disabled:opacity-60"
          >
            <Square size={12} />
          </button>
        </div>
      ) : pause ? (
        <div className="flex items-center gap-1.5">
          <span className={cn(pillClass, "cursor-default hover:bg-transparent")}>
            <Coffee size={13} />
            <span className="hidden sm:inline">
              {pause.kind === "long" ? "Pausa longa" : "Pausa"}
            </span>
            <span className="font-mono tabular-nums">{formatClock(pause.endsAt - now)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              changePause(null);
              setPanelOpen(true);
            }}
            aria-label="Pular a pausa"
            title="Pular a pausa e voltar ao foco"
            className="flex size-8 items-center justify-center rounded-md border border-border text-text-primary hover:bg-border/40"
          >
            <SkipForward size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 font-medium text-accent-contrast hover:bg-accent/90"
        >
          <Play size={12} />
          Iniciar
        </button>
      )}

      {failed && (
        <span className="text-red-600" title="Não consegui atualizar as horas">
          !
        </span>
      )}

      {panelOpen && (
        <div
          className={cn(
            "z-20 rounded-xl border border-border bg-surface p-3 shadow-lg",
            "fixed inset-x-4 top-16 max-h-[80vh] overflow-y-auto",
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96",
          )}
        >
          <EntryDetailsPanel
            categories={status.categories}
            projects={status.projects}
            settings={settings}
            initial={running ? detailsOf(running) : idleDetails}
            running={Boolean(running)}
            busy={saving}
            onStart={startEntry}
            onSave={saveRunning}
            onOpenSettings={() => {
              setPanelOpen(false);
              setSettingsOpen(true);
            }}
          />
        </div>
      )}

      {/* Fora do cabeçalho: o `backdrop-blur` dele vira o referencial do
          `fixed`, e o modal abria cortado dentro da barra de 56px. */}
      {settingsOpen &&
        createPortal(
          <PomodoroSettingsModal
            settings={settings}
            onClose={() => setSettingsOpen(false)}
            onSaved={(next) => setStatus((s) => (s ? { ...s, settings: next } : s))}
          />,
          document.body,
        )}
    </div>
  );
}
