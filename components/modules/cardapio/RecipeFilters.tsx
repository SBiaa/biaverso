"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { recipeCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(recipeCategoryLabels);

export function RecipeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get("category") ?? ""}
      onChange={(e) => setCategory(e.target.value)}
      className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="">Todas as categorias</option>
      {categoryOptions.map((c) => (
        <option key={c} value={c}>
          {recipeCategoryLabels[c]}
        </option>
      ))}
    </select>
  );
}
