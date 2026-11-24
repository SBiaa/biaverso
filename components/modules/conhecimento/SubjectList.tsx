"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { cardColumns } from "@/components/layout/page-width";
import { SortableList } from "./SortableList";
import { SubjectBlock, type SubjectData } from "./SubjectBlock";

export function SubjectList({ areaId, subjects }: { areaId: string; subjects: SubjectData[] }) {
  const router = useRouter();

  async function reorder(ids: string[]) {
    await api.post("/api/study/subjects/reorder", { parentId: areaId, ids });
    router.refresh();
  }

  return (
    <SortableList items={subjects} onReorder={reorder} layout="grid" className={cardColumns}>
      {(subject, handle) => <SubjectBlock subject={subject} handle={handle} />}
    </SortableList>
  );
}
