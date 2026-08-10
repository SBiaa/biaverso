"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KANBAN_COLUMNS, SCOPE_OPTIONS } from "@/lib/ace-shared";

type ClientOption = { id: string; name: string };

export function AceFilterBar({
  clients,
  showType = true,
  showStatus = true,
}: {
  clients: ClientOption[];
  showType?: boolean;
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Escolher um cliente já implica "de cliente": deixar o escopo antigo
    // colado poderia zerar a lista (cliente X + escopo interno = nada).
    if (key === "clientId" && value) params.delete("scope");
    if (key === "scope" && value) params.delete("clientId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={searchParams.get("scope") ?? ""}
        onChange={(e) => setParam("scope", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {SCOPE_OPTIONS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("clientId") ?? ""}
        onChange={(e) => setParam("clientId", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todos os clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {showType && (
        <select
          value={searchParams.get("itemType") ?? ""}
          onChange={(e) => setParam("itemType", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Posts e produção</option>
          <option value="post">Só posts</option>
          <option value="task">Só produção</option>
        </select>
      )}

      {showStatus && (
        <select
          value={searchParams.get("itemStatus") ?? ""}
          onChange={(e) => setParam("itemStatus", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todos os status</option>
          {KANBAN_COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
