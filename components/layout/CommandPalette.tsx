"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getBusinessIcon } from "@/lib/business-visuals";
import { navGroups, type NavItem } from "./nav-config";

/**
 * Ir direto para qualquer tela, digitando o nome.
 *
 * A sidebar tem mais de vinte links de peso visual idêntico, e no celular eles
 * moram atrás de "Mais" — achar "Lista de desejos" era varredura com o olho.
 * Aqui você abre com Ctrl+K, digita três letras e dá Enter.
 */

type Business = { id: string; name: string; icon: string | null };

type Destination = NavItem & { group: string };

/** "Avaliação" tem que ser achável digitando "avaliacao". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * O botão fica na sidebar, que é `hidden` no celular — e um `fixed` dentro de
 * um ancestral escondido não pinta. Por isso o painel mora no layout, solto, e
 * o botão só avisa que é para abrir.
 */
const OPEN_EVENT = "biaverso:abrir-busca";

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={cn(
        "mb-4 flex w-full items-center gap-2 rounded-lg border border-border",
        "bg-surface/60 px-3 py-2 text-sm text-text-secondary transition-colors",
        "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      <Search size={15} className="shrink-0" />
      <span className="flex-1 text-left">Buscar</span>
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[11px] text-text-secondary">
        Ctrl K
      </kbd>
    </button>
  );
}

export function CommandPalette({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.ctrlKey && !event.metaKey) return;
      // Ctrl+K é "apagar até o fim da linha" num campo de texto; fora de um
      // campo ele não faz nada, então dá para tomar o atalho sem atrapalhar.
      event.preventDefault();
      setOpen((prev) => !prev);
    }

    function onRequest() {
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onRequest);
    };
  }, []);

  const destinations = useMemo<Destination[]>(() => {
    const fromNav = navGroups.flatMap((group) =>
      group.items.map((item) => ({ ...item, group: group.title })),
    );
    const fromBusinesses = businesses.map((business) => ({
      href: `/negocios/${business.id}`,
      label: business.name,
      icon: getBusinessIcon(business.icon),
      group: "Negócios",
    }));
    return [...fromNav, ...fromBusinesses];
  }, [businesses]);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return destinations;
    return destinations.filter(
      (d) => normalize(d.label).includes(term) || normalize(d.group).includes(term),
    );
  }, [destinations, query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <Modal
      title="Ir para"
      size="md"
      scrollBody={false}
      onClose={() => setOpen(false)}
    >
      <div className="flex items-center gap-2 rounded-md border border-border px-3">
        <Search size={15} className="shrink-0 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Recomeça do topo: sem isso o Enter leva para o resultado que
            // estava destacado na busca anterior.
            setHighlight(0);
          }}
          placeholder="Financeiro, receitas, senhas…"
          aria-label="Buscar uma tela"
          className="w-full bg-transparent py-2 text-sm outline-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((i) => (i + 1) % Math.max(results.length, 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight(
                (i) =>
                  (i - 1 + Math.max(results.length, 1)) %
                  Math.max(results.length, 1),
              );
            } else if (e.key === "Enter") {
              e.preventDefault();
              const target = results[highlight];
              if (target) go(target.href);
            }
          }}
        />
      </div>

      <ul ref={listRef} className="-mx-1 flex flex-col overflow-y-auto px-1">
        {results.length === 0 ? (
          <li className="py-4 text-sm text-text-secondary">
            Nenhuma tela com esse nome.
          </li>
        ) : (
          results.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={`${item.group}-${item.href}`}>
                <button
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-sm",
                    index === highlight
                      ? "bg-accent/10 text-accent"
                      : "text-text-primary",
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {item.group}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}
