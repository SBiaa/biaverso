"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  InlineEdit,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { knowledgeStatusLabels } from "@/lib/labels";
import { cn, formatDateBR, toDateInputValue, todayInputValue } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { SortableList } from "./SortableList";

const statusOptions = Object.keys(knowledgeStatusLabels);
const field =
  "rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent";

export type CourseData = {
  id: string;
  title: string;
  instructor: string | null;
  platform: string | null;
  link: string | null;
  notes: string | null;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type LessonData = {
  id: string;
  title: string;
  link: string | null;
  notes: string | null;
  done: boolean;
  completedAt: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
};

/**
 * Curso como caderno: o índice das aulas de um lado, a página da aula aberta
 * do outro. A aula que abre sozinha é a de hoje (ou a mais atrasada); sem
 * agenda, a primeira que ainda falta.
 */
export function CourseView({
  course,
  lessons,
  backHref,
  initialLessonId,
}: {
  course: CourseData;
  lessons: LessonData[];
  backHref: string;
  initialLessonId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimisticLessons, setDone] = useOptimistic(
    lessons,
    (current, change: { id: string; done: boolean }) =>
      current.map((l) => (l.id === change.id ? { ...l, done: change.done } : l)),
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialLessonId && lessons.some((l) => l.id === initialLessonId)) return initialLessonId;
    const today = todayInputValue();
    const due = lessons.find(
      (l) => !l.done && l.scheduledDate && toDateInputValue(l.scheduledDate) <= today,
    );
    return (due ?? lessons.find((l) => !l.done) ?? lessons[0])?.id ?? null;
  });
  const [showDetails, setShowDetails] = useState(false);

  const done = optimisticLessons.filter((l) => l.done).length;
  const index = optimisticLessons.findIndex((l) => l.id === selectedId);
  // Aula apagada: cai na vizinha em vez de deixar a página em branco.
  const selected = optimisticLessons[index] ?? optimisticLessons[0] ?? null;
  const selectedIndex = selected ? optimisticLessons.indexOf(selected) : -1;

  async function patchCourse(body: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/api/study/courses/${course.id}`, body);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  }

  async function handleDeleteCourse() {
    const confirmed = await confirmAction({
      title: `Excluir o curso "${course.title}"?`,
      description: "As aulas dele também serão excluídas.",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/study/courses/${course.id}`);
      notify("Curso excluído.");
      router.push(backHref);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function reorderLessons(ids: string[]) {
    await api.post("/api/study/lessons/reorder", { parentId: course.id, ids });
    router.refresh();
  }

  function toggle(lesson: LessonData) {
    setError(null);
    startTransition(async () => {
      setDone({ id: lesson.id, done: !lesson.done });
      try {
        await api.patch(`/api/study/lessons/${lesson.id}`, { done: !lesson.done });
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <Card className="flex flex-col gap-3">
        <ErrorNote message={error} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <InlineEdit
              value={course.title}
              ariaLabel="Nome do curso"
              onSave={(title) => patchCourse({ title })}
              className="text-lg font-semibold text-text-primary"
            />
            <p className="mt-0.5 text-xs text-text-secondary">
              {[course.instructor, course.platform].filter(Boolean).join(" · ") ||
                "Clique em “Detalhes” para dizer quem ensina e onde"}
              {course.startedAt && ` · começou em ${formatDateBR(new Date(course.startedAt))}`}
              {course.finishedAt && ` · concluído em ${formatDateBR(new Date(course.finishedAt))}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={course.status}
              onChange={(e) => patchCourse({ status: e.target.value })}
              aria-label="Status do curso"
              className={field}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {knowledgeStatusLabels[s]}
                </option>
              ))}
            </select>
            <IconButton
              onClick={() => setShowDetails((v) => !v)}
              aria-label="Detalhes do curso"
              title="Detalhes do curso"
            >
              <Settings2 size={16} />
            </IconButton>
            <IconButton onClick={handleDeleteCourse} aria-label="Excluir curso" tone="danger">
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>

        <ProgressBar done={done} total={optimisticLessons.length} />

        {showDetails && (
          <div className="grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <InlineEdit
                value={course.instructor ?? ""}
                placeholder="Quem ensina"
                ariaLabel="Quem ensina"
                onSave={(instructor) => patchCourse({ instructor })}
                className="text-text-secondary"
              />
              <InlineEdit
                value={course.platform ?? ""}
                placeholder="Plataforma (Udemy, YouTube...)"
                ariaLabel="Plataforma"
                onSave={(platform) => patchCourse({ platform })}
                className="text-text-secondary"
              />
              <InlineEdit
                value={course.link ?? ""}
                placeholder="Link do curso"
                ariaLabel="Link do curso"
                onSave={(link) => patchCourse({ link })}
                className="text-text-secondary"
              />
              {course.link && (
                <a
                  href={course.link}
                  target="_blank"
                  rel="noreferrer"
                  className="-my-2 inline-flex w-fit items-center gap-1 py-2 text-xs font-medium text-accent"
                >
                  Abrir curso <ExternalLink size={12} />
                </a>
              )}
            </div>
            <InlineEdit
              value={course.notes ?? ""}
              placeholder="Anotações gerais do curso"
              ariaLabel="Anotações do curso"
              multiline
              onSave={(notes) => patchCourse({ notes })}
              className="text-sm text-text-secondary"
            />
          </div>
        )}
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
        <Card className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Índice</h2>
            <ScheduleButton courseId={course.id} pending={optimisticLessons.length - done} onError={setError} />
          </div>

          {optimisticLessons.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma aula ainda. Escreva a primeira abaixo ou cole uma lista inteira.
            </p>
          ) : (
            <SortableList
              items={optimisticLessons}
              onReorder={reorderLessons}
              className="flex max-h-[60vh] flex-col overflow-y-auto"
            >
              {(lesson, handle) => (
                <IndexRow
                  lesson={lesson}
                  handle={handle}
                  active={lesson.id === selected?.id}
                  onOpen={() => setSelectedId(lesson.id)}
                  onToggle={() => toggle(lesson)}
                />
              )}
            </SortableList>
          )}

          <AddLessons courseId={course.id} onError={setError} />
        </Card>

        {selected ? (
          <LessonPage
            key={selected.id}
            lesson={selected}
            position={`${selectedIndex + 1} de ${optimisticLessons.length}`}
            onPrev={
              selectedIndex > 0 ? () => setSelectedId(optimisticLessons[selectedIndex - 1].id) : undefined
            }
            onNext={
              selectedIndex < optimisticLessons.length - 1
                ? () => setSelectedId(optimisticLessons[selectedIndex + 1].id)
                : undefined
            }
            onToggle={() => toggle(selected)}
            onError={setError}
          />
        ) : (
          <Card className="text-sm text-text-secondary">
            As aulas viram páginas do caderno. Adicione a primeira no índice.
          </Card>
        )}
      </div>
    </div>
  );
}

function IndexRow({
  lesson,
  handle,
  active,
  onOpen,
  onToggle,
}: {
  lesson: LessonData;
  handle: ReactNode;
  active: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const late =
    !lesson.done && lesson.scheduledDate && toDateInputValue(lesson.scheduledDate) < todayInputValue();
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1",
        active ? "bg-accent/10" : "hover:bg-hover",
      )}
    >
      {handle}
      <input
        type="checkbox"
        checked={lesson.done}
        onChange={onToggle}
        aria-label={`Marcar "${lesson.title}" como feita`}
        className="size-5 shrink-0 cursor-pointer accent-[var(--color-accent)]"
      />
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center px-2 text-left"
      >
        <span
          className={cn(
            "truncate text-sm",
            lesson.done ? "text-text-secondary line-through" : "text-text-primary",
            active && "font-medium",
          )}
        >
          {lesson.title}
        </span>
        {lesson.scheduledDate && !lesson.done && (
          <span className={cn("text-xs", late ? "font-medium text-danger" : "text-text-secondary")}>
            {formatDateBR(new Date(lesson.scheduledDate))}
            {late && " · atrasada"}
          </span>
        )}
      </button>
      {lesson.notes && (
        <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Tem anotação" aria-label="Tem anotação" />
      )}
    </div>
  );
}

function LessonPage({
  lesson,
  position,
  onPrev,
  onNext,
  onToggle,
  onError,
}: {
  lesson: LessonData;
  position: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToggle: () => void;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();

  async function patch(body: Record<string, unknown>) {
    onError(null);
    try {
      await api.patch(`/api/study/lessons/${lesson.id}`, body);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
      throw e;
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Excluir a aula "${lesson.title}"?`,
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/study/lessons/${lesson.id}`);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  const overdue =
    !lesson.done && lesson.dueDate && toDateInputValue(lesson.dueDate) < todayInputValue();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
        <span>Página {position}</span>
        <div className="flex items-center gap-1">
          <IconButton onClick={onPrev} disabled={!onPrev} aria-label="Aula anterior">
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton onClick={onNext} disabled={!onNext} aria-label="Próxima aula">
            <ChevronRight size={16} />
          </IconButton>
          <IconButton onClick={handleDelete} aria-label="Excluir aula" tone="danger">
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <InlineEdit
        value={lesson.title}
        ariaLabel="Título da aula"
        onSave={(title) => patch({ title })}
        className="text-xl font-semibold text-text-primary"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={lesson.done}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
            lesson.done
              ? "bg-accent/10 text-accent hover:bg-accent/20"
              : "bg-accent text-accent-contrast hover:bg-accent/90",
          )}
        >
          <Check size={16} />
          {lesson.done ? "Feita — desfazer" : "Marcar como feita"}
        </button>
        {lesson.done && lesson.completedAt && (
          <span className="text-xs text-text-secondary">
            em {formatDateBR(new Date(lesson.completedAt))}
          </span>
        )}
        {lesson.done && onNext && (
          <Button variant="ghost" onClick={onNext}>
            Próxima aula <ChevronRight size={16} />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
        <label className="flex items-center gap-1.5">
          <CalendarClock size={14} /> Fazer em
          <input
            type="date"
            value={lesson.scheduledDate ? toDateInputValue(lesson.scheduledDate) : ""}
            onChange={(e) => patch({ scheduledDate: e.target.value || null }).catch(() => {})}
            className={field}
          />
        </label>
        <label className="flex items-center gap-1.5">
          Prazo
          <input
            type="date"
            value={lesson.dueDate ? toDateInputValue(lesson.dueDate) : ""}
            onChange={(e) => patch({ dueDate: e.target.value || null }).catch(() => {})}
            className={cn(field, overdue && "border-danger text-danger")}
          />
        </label>
        {overdue && <span className="self-center font-medium text-danger">atrasada</span>}
      </div>

      <NotesEditor
        initial={lesson.notes ?? ""}
        onSave={(notes) => patch({ notes })}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <InlineEdit
          value={lesson.link ?? ""}
          placeholder="+ Link da aula (vídeo, texto...)"
          ariaLabel="Link da aula"
          onSave={(link) => patch({ link })}
          className="text-text-secondary"
        />
        {lesson.link && (
          <a
            href={lesson.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent"
          >
            Abrir <ExternalLink size={12} />
          </a>
        )}
      </div>
    </Card>
  );
}

/**
 * Anotação da aula: escreve direto na página, sem clicar para editar nem
 * apertar salvar. Grava sozinha ~1s depois de parar de digitar, e de novo ao
 * sair do campo.
 */
function NotesEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (notes: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const savedRef = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text, onSave });
  useEffect(() => {
    latest.current = { text, onSave };
  });

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = latest.current.text;
    if (value === savedRef.current) {
      setState("saved");
      return;
    }
    setState("saving");
    try {
      // Texto vazio apaga a anotação (o campo do PATCH aceita string vazia como "limpar").
      await latest.current.onSave(value);
      savedRef.current = value;
      setState(latest.current.text === value ? "saved" : "dirty");
    } catch {
      setState("error");
    }
  }

  // Sair da aula com algo por gravar (trocar de página do caderno) não pode perder o texto.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latest.current.text !== savedRef.current) void latest.current.onSave(latest.current.text);
      }
    },
    [],
  );

  const rows = useMemo(() => Math.max(10, text.split("\n").length + 2), [text]);

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={text}
        rows={rows}
        placeholder="Escreva aqui o que você aprendeu: palavras-chave, imagem, o que a carta quer dizer..."
        aria-label="Anotações da aula"
        onChange={(e) => {
          setText(e.target.value);
          setState("dirty");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, 1000);
        }}
        onBlur={flush}
        className="min-h-60 w-full resize-y rounded-lg border border-border/60 bg-surface p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent"
      />
      <p
        className={cn("text-xs", state === "error" ? "text-danger" : "text-text-secondary")}
        aria-live="polite"
      >
        {state === "saved" && "Salvo"}
        {state === "dirty" && "Editando…"}
        {state === "saving" && "Salvando…"}
        {state === "error" && "Não consegui salvar. Clique fora do campo para tentar de novo."}
      </p>
    </div>
  );
}

/** Pede a data de início e espalha as aulas que faltam, uma por dia. */
function ScheduleButton({
  courseId,
  pending,
  onError,
}: {
  courseId: string;
  pending: number;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);

  if (pending === 0) return null;

  async function run() {
    setSaving(true);
    onError(null);
    try {
      await api.post(`/api/study/courses/${courseId}/schedule`, { startDate: start });
      setOpen(false);
      router.refresh();
      notify(`${pending} ${pending === 1 ? "aula agendada" : "aulas agendadas"}, uma por dia.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-my-2 inline-flex items-center gap-1 py-2 text-xs font-medium text-accent"
      >
        <CalendarClock size={13} /> Uma por dia
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="flex items-center gap-1.5 text-text-secondary">
        a partir de
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
      </label>
      <Button onClick={run} disabled={saving || !start} className="min-h-9 px-3">
        Agendar {pending}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)} className="min-h-9 px-3">
        Cancelar
      </Button>
    </div>
  );
}

/**
 * Uma linha + Enter adiciona uma aula e já deixa o campo pronto para a próxima.
 * Para trazer uma lista inteira, “Colar várias” abre a caixa de uma por linha.
 */
function AddLessons({
  courseId,
  onError,
}: {
  courseId: string;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [bulk, setBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const titles = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (titles.length === 0) return;

    setSaving(true);
    onError(null);
    try {
      await api.post("/api/study/lessons", { courseId, titles });
      setText("");
      router.refresh();
      if (titles.length > 1) notify(`${titles.length} aulas adicionadas.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
      // Volta o foco para digitar a próxima sem pegar o mouse.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
      {bulk ? (
        <>
          <textarea
            autoFocus
            placeholder="Cole a lista — uma aula por linha"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="resize-y rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving || !text.trim()} className="min-h-9">
              Adicionar {text.split("\n").filter((l) => l.trim()).length || ""}
            </Button>
            <Button variant="ghost" onClick={() => setBulk(false)} className="min-h-9">
              Voltar
            </Button>
          </div>
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            placeholder="+ Nova aula (Enter para adicionar)"
            value={text}
            disabled={saving}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => setBulk(true)}
            className="-my-2 w-fit py-2 text-xs font-medium text-accent"
          >
            Colar várias de uma vez
          </button>
        </>
      )}
    </div>
  );
}
