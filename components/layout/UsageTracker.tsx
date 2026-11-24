"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { NavSource } from "@/lib/usage-shared";

/**
 * Anota cada tela aberta no registro de uso (ver `lib/usage.ts`).
 *
 * Além da tela, guarda *como* ela chegou lá — pela barra do celular, pelo menu
 * lateral, pela busca ou por um link dentro de outra tela — e uma sessão por
 * aba, para a página "Uso do app" medir por quantas telas ela passa até cada destino.
 */

const SESSION_KEY = "biaverso_uso_sessao";
/** Meia hora parada encerra a sessão: voltar depois é outro percurso. */
const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Um clique só explica a navegação que vem logo depois dele. */
const SOURCE_TTL_MS = 5000;

let pendingSource: { source: NavSource; at: number } | null = null;

/** Para navegações sem `<a>`, como a busca, que chama `router.push`. */
export function markNavSource(source: NavSource) {
  pendingSource = { source, at: Date.now() };
}

function takeSource(): NavSource {
  const pending = pendingSource;
  pendingSource = null;
  if (pending && Date.now() - pending.at < SOURCE_TTL_MS) return pending.source;
  // Sem clique antes: abriu pelo endereço, recarregou ou usou o "voltar".
  return "direto";
}

function sessionId() {
  const now = Date.now();
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as
      | { id: string; lastAt: number }
      | null;
    const id =
      stored && now - stored.lastAt < SESSION_IDLE_MS ? stored.id : crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastAt: now }));
    return id;
  } catch {
    return "sem-sessao";
  }
}

export function UsageTracker() {
  const pathname = usePathname();
  const lastSent = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    // Captura antes do Next tratar o clique. O contêiner do link diz de onde
    // ele veio (`data-nav-source` na barra e no menu); o resto é link comum.
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      if (!link) return;
      const container = link.closest<HTMLElement>("[data-nav-source]");
      markNavSource((container?.dataset.navSource as NavSource | undefined) ?? "link");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    // O modo estrito do React roda o efeito duas vezes em desenvolvimento.
    const now = Date.now();
    if (lastSent.current?.path === pathname && now - lastSent.current.at < 1500) return;
    lastSent.current = { path: pathname, at: now };

    const body = JSON.stringify({
      path: pathname,
      // O mesmo corte do layout: abaixo de `md` é a versão de celular.
      device: window.matchMedia("(min-width: 768px)").matches ? "desktop" : "mobile",
      source: takeSource(),
      sessionId: sessionId(),
    });

    // `keepalive`: a visita ainda chega se ela fechar a aba logo em seguida.
    fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Sem rede: uma visita a menos no registro não vale um aviso na tela.
    });
  }, [pathname]);

  return null;
}
