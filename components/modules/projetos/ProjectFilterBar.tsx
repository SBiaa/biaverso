"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { projectStatusLabels } from "@/lib/labels";
import { projectSortOptions } from "@/lib/projects-shared";

const sortLabels: Record<string, string> = {
  prazo: "Por prazo",
  status: "Por status",
  alfabetica: "Alfabética",
};

const scopeLabels: Record<string, string> = {
  cliente: "De cliente",
  interno: "Internos",
};

type BusinessOption = { id: string; name: string };

/** Filtros da página de projetos — o estado mora na URL, então recarregar mantém a visão. */
export function ProjectFilterBar({
  businesses,
  showBusiness = true,
}: {
  businesses: BusinessOption[];
  showBusiness?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass =
    "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showBusiness && (
        <select
          value={searchParams.get("businessId") ?? ""}
          onChange={(e) => setParam("businessId", e.target.value)}
          className={selectClass}
        >
          <option value="">Todos os negócios</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os status</option>
        {Object.keys(projectStatusLabels).map((s) => (
          <option key={s} value={s}>
            {projectStatusLabels[s]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("scope") ?? ""}
        onChange={(e) => setParam("scope", e.target.value)}
        className={selectClass}
      >
        <option value="">Cliente e interno</option>
        {Object.keys(scopeLabels).map((s) => (
          <option key={s} value={s}>
            {scopeLabels[s]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("sort") ?? "prazo"}
        onChange={(e) => setParam("sort", e.target.value)}
        className={selectClass}
      >
        {projectSortOptions.map((s) => (
          <option key={s} value={s}>
            {sortLabels[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
