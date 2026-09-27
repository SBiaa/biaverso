"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { knowledgeAreaLabels, knowledgeTypeLabels, studyStatusLabels } from "@/lib/labels";

const typeOptions = Object.keys(knowledgeTypeLabels);
const areaOptions = Object.keys(knowledgeAreaLabels);
const statusOptions = Object.keys(studyStatusLabels);

export function KnowledgeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todos os tipos</option>
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {knowledgeTypeLabels[t]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("area") ?? ""}
        onChange={(e) => setParam("area", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todas as áreas</option>
        {areaOptions.map((a) => (
          <option key={a} value={a}>
            {knowledgeAreaLabels[a]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todos os status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {studyStatusLabels[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
