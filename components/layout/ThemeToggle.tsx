"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Claro, escuro ou o que o sistema estiver usando.
 *
 * Os tokens do tema escuro já existiam no `globals.css` desde o começo, sem
 * nada que os ligasse. Aqui está a chave.
 *
 * A escolha vive em `localStorage` e é aplicada por um script no `<head>`
 * (`app/layout.tsx`) antes da primeira pintura — se esperasse o React montar,
 * a tela piscaria branca a cada carregamento no tema escuro.
 */

export type Theme = "claro" | "escuro" | "sistema";

export const THEME_STORAGE_KEY = "biaverso:tema";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "escuro", label: "Escuro", icon: Moon },
  { value: "sistema", label: "Sistema", icon: Monitor },
];

function apply(theme: Theme) {
  const resolved =
    theme === "sistema"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme === "escuro"
        ? "dark"
        : "light";

  document.documentElement.dataset.theme = resolved;
}

/**
 * A escolha vive no `localStorage`, que é estado de fora do React. Ler por
 * `useSyncExternalStore` em vez de copiar para um `useState` num efeito: o
 * servidor devolve "sistema" (ele não tem como saber), o cliente lê o valor
 * real, e o React cuida de reconciliar os dois sem aviso de hidratação.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // `storage` cobre a troca feita em outra aba.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "claro" || saved === "escuro" ? saved : "sistema";
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "sistema");

  useEffect(() => {
    // Em "sistema", trocar o tema do SO troca o do app na hora.
    if (theme !== "sistema") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("sistema");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    apply(next);
    listeners.forEach((listener) => listener());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-border bg-surface p-1",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => choose(option.value)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover",
            )}
          >
            <Icon size={15} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
