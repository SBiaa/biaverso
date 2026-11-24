"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { recipeCategoryLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const categoryOptions = Object.keys(recipeCategoryLabels);

export function RecipeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onlyReady = searchParams.get("pronto") === "1";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value || null)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todas as refeições</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {recipeCategoryLabels[c]}
          </option>
        ))}
      </select>
      {/* "Com o que tem em casa": o filtro que responde "o que eu consigo
          cozinhar agora?" sem abrir receita por receita. */}
      <button
        type="button"
        aria-pressed={onlyReady}
        onClick={() => setParam("pronto", onlyReady ? null : "1")}
        className={cn(
          "min-h-9 rounded-md border px-3 text-sm transition-colors",
          onlyReady
            ? "border-accent bg-accent text-accent-contrast"
            : "border-border bg-surface text-text-secondary hover:bg-hover",
        )}
      >
        Dá pra fazer
      </button>
    </div>
  );
}
