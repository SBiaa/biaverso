"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FolderKanban,
  Gift,
  GraduationCap,
  KeyRound,
  Lightbulb,
  Package,
  Search,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { getBusinessIcon } from "@/lib/business-visuals";
import type { SearchHit } from "@/app/api/search/route";
import { navGroups, searchPages } from "./nav-config";

/**
 * Ir direto para qualquer tela ou registro, digitando o nome.
 *
 * A sidebar tem mais de vinte links de peso visual idêntico, e no celular eles
 * moram atrás de "Mais" — achar "Lista de desejos" era varredura com o olho.
 * Aqui você abre com Ctrl+K, digita três letras e dá Enter. Além das telas do
 * menu, acha as abas internas (Dívidas, Despensa, Tiragens) e o conteúdo:
 * clientes, projetos, receitas, livros...
 */

type Business = { id: string; name: string; icon: string | null };

type Result = {
  key: string;
  label: string;
  /** Texto cinza à direita: o grupo da tela ou o tipo do registro. */
  group: string;
  href: string;
  icon: LucideIcon;
  /** Palavras extras que também acham a tela. */
  keywords?: string[];
};

const contentIcons: Record<string, LucideIcon> = {
  Cliente: Users,
  Projeto: FolderKanban,
  Produto: Package,
  Receita: UtensilsCrossed,
  Livro: BookOpen,
  Desejo: Gift,
  Ideia: Lightbulb,
  Senha: KeyRound,
  Curso: GraduationCap,
};

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
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-xs text-text-secondary">
        Ctrl K
      </kbd>
    </button>
  );
}

/**
 * Conteúdo do banco para o termo digitado. Espera a pessoa parar de digitar
 * (250ms) e descarta respostas que chegam depois de uma busca mais nova.
 */
function useContentSearch(query: string) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const term = query.trim();
  const active = term.length >= 2;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get<SearchHit[]>(`/api/search?q=${encodeURIComponent(term)}`)
        .then((list) => !cancelled && setHits(list))
        // Sem conteúdo, a busca de telas continua funcionando.
        .catch(() => !cancelled && setHits([]))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, active]);

  return { hits: active ? hits : [], loading: active && loading };
}

export function CommandPalette({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const content = useContentSearch(open ? query : "");

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

  const pages = useMemo<Result[]>(() => {
    const fromNav = navGroups.flatMap((group) =>
      group.items.map((item) => ({
        key: `nav:${item.href}`,
        label: item.label,
        group: group.title,
        href: item.href,
        icon: item.icon,
      })),
    );
    const fromTabs = searchPages.map((page) => ({
      key: `tab:${page.href}`,
      label: page.label,
      group: page.group,
      href: page.href,
      icon: page.icon,
      keywords: page.keywords,
    }));
    const fromBusinesses = businesses.map((business) => ({
      key: `biz:${business.id}`,
      label: business.name,
      group: "Negócios",
      href: `/negocios/${business.id}`,
      icon: getBusinessIcon(business.icon),
    }));
    return [...fromNav, ...fromBusinesses, ...fromTabs];
  }, [businesses]);

  const results = useMemo<Result[]>(() => {
    const term = normalize(query.trim());
    // Sem nada digitado, só o menu: as abas internas encheriam a lista.
    if (!term) return pages.filter((p) => !p.key.startsWith("tab:"));
    const matchedPages = pages.filter(
      (p) =>
        normalize(p.label).includes(term) ||
        normalize(p.group).includes(term) ||
        p.keywords?.some((k) => normalize(k).includes(term)),
    );
    const matchedContent = content.hits.map((hit, i) => ({
      key: `hit:${hit.kind}:${i}:${hit.href}`,
      label: hit.label,
      group: hit.detail ? `${hit.kind} · ${hit.detail}` : hit.kind,
      href: hit.href,
      icon: contentIcons[hit.kind] ?? Search,
    }));
    return [...matchedPages, ...matchedContent];
  }, [pages, query, content.hits]);

  // Resultados que chegam do banco mudam a lista: o destaque não pode ficar
  // apontando para além do fim dela.
  const safeHighlight = Math.min(highlight, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${safeHighlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeHighlight]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  if (!open) return null;

  const firstContent = results.findIndex((r) => r.key.startsWith("hit:"));

  return (
    <Modal
      title="Buscar"
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
          placeholder="Telas, clientes, receitas, livros…"
          aria-label="Buscar telas e registros"
          className="w-full bg-transparent py-2 text-sm outline-none"
          onKeyDown={(e) => {
            const total = Math.max(results.length, 1);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((safeHighlight + 1) % total);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((safeHighlight - 1 + total) % total);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const target = results[safeHighlight];
              if (target) go(target.href);
            }
          }}
        />
      </div>

      <ul ref={listRef} className="-mx-1 flex flex-col overflow-y-auto px-1" aria-live="polite">
        {results.length === 0 ? (
          <li className="py-4 text-sm text-text-secondary">
            {content.loading ? "Procurando…" : "Nada encontrado com esse nome."}
          </li>
        ) : (
          results.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                {index === firstContent && (
                  <p className="mt-2 border-t border-border px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Registros
                  </p>
                )}
                <button
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-sm",
                    index === safeHighlight
                      ? "bg-accent/10 text-accent-ink"
                      : "text-text-primary",
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="max-w-[45%] shrink-0 truncate text-xs text-text-secondary">
                    {item.group}
                  </span>
                </button>
              </li>
            );
          })
        )}
        {results.length > 0 && content.loading && firstContent === -1 && (
          <li className="px-2 py-2 text-xs text-text-secondary">Procurando nos registros…</li>
        )}
      </ul>
    </Modal>
  );
}
