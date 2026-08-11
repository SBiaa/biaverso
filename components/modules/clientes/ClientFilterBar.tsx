"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type BusinessOption = { id: string; name: string };

/** Busca por nome e filtro por negócio, ambos guardados na URL. */
export function ClientFilterBar({ businesses }: { businesses: BusinessOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Voltar/avançar do navegador mexe na URL sem passar pelo input. O ajuste é
  // feito durante o render (padrão do React para "estado derivado de prop") e
  // não num efeito, que renderizaria a lista duas vezes a cada navegação.
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  function push(next: URLSearchParams) {
    router.push(`${pathname}?${next.toString()}`);
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    push(params);
  }

  // A busca só vai para a URL quando para de digitar: uma navegação por tecla
  // recarregaria a lista inteira do servidor a cada letra.
  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query) params.set("q", query);
      else params.delete("q");
      push(params);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome…"
          aria-label="Buscar cliente"
          className="w-full rounded-md border border-border py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <select
        value={searchParams.get("businessId") ?? ""}
        onChange={(e) => setParam("businessId", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Todos os negócios</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
        <option value="__none__">Sem negócio</option>
      </select>
    </div>
  );
}
