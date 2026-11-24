"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui";
import { api } from "@/lib/client-api";
import { itemGrid } from "@/components/layout/page-width";
import { ProgressBar } from "./ProgressBar";
import { SortableList } from "./SortableList";

export type AreaSummary = {
  id: string;
  name: string;
  emoji: string | null;
  subjects: number;
  courses: number;
  studying: number;
  lessonsDone: number;
  lessonsTotal: number;
};

export function AreaGrid({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();

  async function reorder(ids: string[]) {
    await api.post("/api/study/areas/reorder", { ids });
    router.refresh();
  }

  return (
    <SortableList items={areas} onReorder={reorder} layout="grid" className={itemGrid}>
      {(area, handle) => (
        <>
          <Link href={`/conhecimento/${area.id}`} className="block h-full">
            <Card className="flex h-full flex-col gap-2 transition-colors hover:bg-hover">
              <CardTitle className="pr-8">
                <span className="mr-1.5">{area.emoji}</span>
                {area.name}
              </CardTitle>
              <p className="text-xs text-text-secondary">
                {area.subjects} {area.subjects === 1 ? "assunto" : "assuntos"}
                {" · "}
                {area.courses} {area.courses === 1 ? "curso" : "cursos"}
                {area.studying > 0 && ` · ${area.studying} em andamento`}
              </p>
              <ProgressBar done={area.lessonsDone} total={area.lessonsTotal} />
            </Card>
          </Link>
          <div className="absolute right-2 top-2">{handle}</div>
        </>
      )}
    </SortableList>
  );
}
