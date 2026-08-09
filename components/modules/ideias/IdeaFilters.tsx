"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ideaStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(ideaStatusLabels);

type Business = { id: string; name: string };

export function IdeaFilters({ businesses }: { businesses: Business[] }) {
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
        value={searchParams.get("businessId") ?? ""}
        onChange={(e) => setParam("businessId", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todos os destinos</option>
        <option value="PESSOAL">Pessoal</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
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
            {ideaStatusLabels[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
