"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  wishCategoryLabels,
  wishPriorityLabels,
  wishStatusLabels,
} from "@/lib/labels";

type Business = { id: string; name: string };

export function WishlistFilters({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const select = "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={searchParams.get("businessId") ?? ""}
        onChange={(e) => setParam("businessId", e.target.value)}
        className={select}
      >
        <option value="">Para tudo</option>
        <option value="PESSOAL">Pessoal/Casa</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className={select}
      >
        <option value="">Todas as categorias</option>
        {Object.keys(wishCategoryLabels).map((c) => (
          <option key={c} value={c}>
            {wishCategoryLabels[c]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => setParam("priority", e.target.value)}
        className={select}
      >
        <option value="">Todas as prioridades</option>
        {Object.keys(wishPriorityLabels).map((p) => (
          <option key={p} value={p}>
            {wishPriorityLabels[p]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={select}
      >
        <option value="">Só os desejados</option>
        {Object.keys(wishStatusLabels).map((s) => (
          <option key={s} value={s}>
            {wishStatusLabels[s]}
          </option>
        ))}
        <option value="TODOS">Todos, inclusive comprados</option>
      </select>
    </div>
  );
}
