"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { bookStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(bookStatusLabels);

export function BookFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get("status") ?? ""}
      onChange={(e) => setStatus(e.target.value)}
      className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="">Todos os status</option>
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {bookStatusLabels[s]}
        </option>
      ))}
    </select>
  );
}
