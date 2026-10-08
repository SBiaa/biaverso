"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, Trash2 } from "lucide-react";
import { Card, confirmAction, ErrorNote, IconButton, InlineEdit, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { knowledgeStatusLabels, knowledgeTypeLabels } from "@/lib/labels";
import { AddCourseForm } from "./AddCourseForm";
import { ProgressBar } from "./ProgressBar";

const statusOptions = Object.keys(knowledgeStatusLabels);

export type SubjectCourse = {
  id: string;
  title: string;
  instructor: string | null;
  platform: string | null;
  status: string;
  lessonsDone: number;
  lessonsTotal: number;
};

export type SubjectMaterial = {
  id: string;
  title: string;
  type: string;
  status: string;
  link: string | null;
};

export type SubjectData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  materials: SubjectMaterial[];
  courses: SubjectCourse[];
};

export function SubjectBlock({ subject, handle }: { subject: SubjectData; handle?: ReactNode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/api/study/subjects/${subject.id}`, body);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Excluir o assunto "${subject.name}"?`,
      description: "Os cursos e aulas dele também serão excluídos.",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/study/subjects/${subject.id}`);
      router.refresh();
      notify("Assunto excluído.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const lessonsDone = subject.courses.reduce((n, c) => n + c.lessonsDone, 0);
  const lessonsTotal = subject.courses.reduce((n, c) => n + c.lessonsTotal, 0);

  return (
    <Card className="flex flex-col gap-3">
      <ErrorNote message={error} />

      <div className="group flex items-start justify-between gap-2">
        {handle}
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={subject.name}
            ariaLabel="Nome do assunto"
            onSave={(name) => patch({ name })}
            className="text-base font-semibold text-text-primary"
          />
          <InlineEdit
            value={subject.description ?? ""}
            placeholder="Para que quer estudar isso?"
            ariaLabel="Descrição do assunto"
            onSave={(description) => patch({ description })}
            className="text-xs text-text-secondary"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <select
            value={subject.status}
            onChange={(e) => patch({ status: e.target.value })}
            aria-label="Status do assunto"
            className="w-fit rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {knowledgeStatusLabels[s]}
              </option>
            ))}
          </select>
          <IconButton
            onClick={handleDelete}
            aria-label={`Excluir ${subject.name}`}
            tone="danger"
            revealOnHover
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      {lessonsTotal > 0 && <ProgressBar done={lessonsDone} total={lessonsTotal} />}

      {subject.courses.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60">
          {subject.courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/conhecimento/curso/${course.id}`}
                className="flex items-center gap-3 py-2.5 transition-colors hover:bg-hover"
              >
                <BookOpen size={16} className="shrink-0 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {[course.instructor, course.platform].filter(Boolean).join(" · ") ||
                      knowledgeStatusLabels[course.status]}
                  </p>
                  <div className="mt-1">
                    <ProgressBar done={course.lessonsDone} total={course.lessonsTotal} />
                  </div>
                </div>
                <span className="hidden shrink-0 text-xs text-text-secondary sm:inline">
                  {knowledgeStatusLabels[course.status]}
                </span>
                <ChevronRight size={16} className="shrink-0 text-text-secondary" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {subject.materials.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-text-secondary">Materiais</p>
          <ul className="flex flex-col gap-1">
            {subject.materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                {m.link ? (
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-text-primary hover:text-accent"
                  >
                    {m.title}
                  </a>
                ) : (
                  <span className="min-w-0 truncate text-text-primary">{m.title}</span>
                )}
                <span className="shrink-0 text-xs text-text-secondary">
                  {knowledgeTypeLabels[m.type]} · {knowledgeStatusLabels[m.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddCourseForm subjectId={subject.id} />
    </Card>
  );
}
