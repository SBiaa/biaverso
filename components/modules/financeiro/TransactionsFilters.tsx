"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { transactionCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(transactionCategoryLabels);

type Business = { id: string; name: string };

export function TransactionsFilters({ businesses }: { businesses: Business[] }) {
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
        <option value="">Todos os negócios</option>
        <option value="PESSOAL">Pessoal/Casa</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Entrada e saída</option>
        <option value="ENTRADA">Entrada</option>
        <option value="SAIDA">Saída</option>
      </select>

      <select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todas as categorias</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {transactionCategoryLabels[c]}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <span className="self-center text-sm text-text-secondary">até</span>
      <input
        type="date"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
