"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
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
  scheduledDate: string | null;
  dueDate: string | null;
};

export function CourseView({
  course,
  lessons,
  backHref,
}: {
  course: CourseData;
  lessons: LessonData[];
  backHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimisticLessons, setDone] = useOptimistic(
    lessons,
    (current, change: { id: string; done: boolean }) =>
      current.map((l) => (l.id === change.id ? { ...l, done: change.done } : l)),
  );

  const done = optimisticLessons.filter((l) => l.done).length;

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
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <ErrorNote message={error} />
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Aulas</CardTitle>
          </div>
          <ProgressBar done={done} total={optimisticLessons.length} />

          {optimisticLessons.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma aula ainda. Cole a lista abaixo, uma por linha.
            </p>
          ) : (
            <SortableList
              items={optimisticLessons}
              onReorder={reorderLessons}
              className="flex flex-col divide-y divide-border/60"
            >
              {(lesson, handle) => (
                <LessonRow
                  lesson={lesson}
                  handle={handle}
                  onToggle={() => toggle(lesson)}
                  onError={setError}
                />
              )}
            </SortableList>
          )}

          <AddLessons courseId={course.id} onError={setError} />
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <InlineEdit
              value={course.title}
              ariaLabel="Nome do curso"
              onSave={(title) => patchCourse({ title })}
              className="text-base font-semibold text-text-primary"
            />
          </div>
          <IconButton onClick={handleDeleteCourse} aria-label="Excluir curso" tone="danger">
            <Trash2 size={15} />
          </IconButton>
        </div>

        <select
          value={course.status}
          onChange={(e) => patchCourse({ status: e.target.value })}
          aria-label="Status do curso"
          className="w-fit rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {knowledgeStatusLabels[s]}
            </option>
          ))}
        </select>

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

        {(course.startedAt || course.finishedAt) && (
          <p className="text-xs text-text-secondary">
            {course.startedAt && `Começou em ${formatDateBR(new Date(course.startedAt))}`}
            {course.startedAt && course.finishedAt && " · "}
            {course.finishedAt && `Concluído em ${formatDateBR(new Date(course.finishedAt))}`}
          </p>
        )}
      </Card>
    </div>
  );
}

function LessonRow({
  lesson,
  handle,
  onToggle,
  onError,
}: {
  lesson: LessonData;
  handle: ReactNode;
  onToggle: () => void;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [showNotes, setShowNotes] = useState(
    Boolean(lesson.notes || lesson.scheduledDate || lesson.dueDate),
  );
  const overdue = !lesson.done && lesson.dueDate && toDateInputValue(lesson.dueDate) < todayInputValue();

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

  return (
    <div className="group flex flex-col py-1.5">
      <div className="flex items-center gap-1">
        {handle}
        <input
          type="checkbox"
          checked={lesson.done}
          onChange={onToggle}
          aria-label={`Marcar "${lesson.title}" como feita`}
          className="size-5 shrink-0 cursor-pointer accent-[var(--color-accent)]"
        />
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={lesson.title}
            ariaLabel="Título da aula"
            onSave={(title) => patch({ title })}
            className={lesson.done ? "text-sm text-text-secondary line-through" : "text-sm"}
          />
          {(lesson.scheduledDate || lesson.dueDate) && (
            <p className="flex flex-wrap gap-x-3 text-xs text-text-secondary">
              {lesson.scheduledDate && (
                <span>Fazer em {formatDateBR(new Date(lesson.scheduledDate))}</span>
              )}
              {lesson.dueDate && (
                <span className={cn(overdue && "font-medium text-danger")}>
                  Prazo {formatDateBR(new Date(lesson.dueDate))}
                  {overdue && " · atrasada"}
                </span>
              )}
            </p>
          )}
        </div>
        {lesson.link && (
          <a
            href={lesson.link}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir aula"
            className="inline-flex size-9 shrink-0 items-center justify-center text-text-secondary hover:text-accent"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <IconButton
          onClick={() => setShowNotes((v) => !v)}
          aria-label="Datas e anotações da aula"
          revealOnHover={!showNotes}
        >
          <CalendarDays size={14} />
        </IconButton>
        <IconButton
          onClick={handleDelete}
          aria-label={`Excluir ${lesson.title}`}
          tone="danger"
          revealOnHover
        >
          <Trash2 size={14} />
        </IconButton>
      </div>

      {showNotes && (
        <div className="ml-14 mt-1 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            <label className="flex items-center gap-1.5">
              Fazer em
              <input
                type="date"
                value={lesson.scheduledDate ? toDateInputValue(lesson.scheduledDate) : ""}
                onChange={(e) => patch({ scheduledDate: e.target.value || null }).catch(() => {})}
                className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Prazo
              <input
                type="date"
                value={lesson.dueDate ? toDateInputValue(lesson.dueDate) : ""}
                onChange={(e) => patch({ dueDate: e.target.value || null }).catch(() => {})}
                className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </div>
          <InlineEdit
            value={lesson.notes ?? ""}
            placeholder="O que você aprendeu nessa aula?"
            ariaLabel="Anotações da aula"
            multiline
            onSave={(notes) => patch({ notes })}
            className="text-xs text-text-secondary"
          />
          <InlineEdit
            value={lesson.link ?? ""}
            placeholder="Link da aula"
            ariaLabel="Link da aula"
            onSave={(link) => patch({ link })}
            className="text-xs text-text-secondary"
          />
        </div>
      )}
    </div>
  );
}

function AddLessons({
  courseId,
  onError,
}: {
  courseId: string;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
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
      notify(titles.length === 1 ? "Aula adicionada." : `${titles.length} aulas adicionadas.`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        placeholder="Adicionar aulas — uma por linha"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={text.includes("\n") ? 5 : 2}
        className="resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <Button onClick={handleSubmit} disabled={saving || !text.trim()} className="w-fit">
        Adicionar
      </Button>
    </div>
  );
}
