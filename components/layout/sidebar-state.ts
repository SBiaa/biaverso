"use client";

import { useSyncExternalStore } from "react";

/**
 * O que está aberto e fechado na barra lateral.
 *
 * Mora no `localStorage`, e não no banco, porque é preferência de tela e não
 * de conta: faz sentido a barra estar fechada no notebook pequeno e aberta no
 * monitor grande.
 *
 * O estado da barra INTEIRA é aplicado por um script antes da primeira pintura
 * (ver `app/layout.tsx`), porque ele muda a largura de tudo — se esperasse o
 * React montar, a página inteira daria um pulo a cada carregamento. Já os
 * grupos fechados moram só aqui: eles mexem dentro da barra, e o ajuste depois
 * da hidratação não empurra o conteúdo.
 */

export const SIDEBAR_KEY = "biaverso:barra";
export const CLOSED_GROUPS_KEY = "biaverso:barra-grupos";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// --------------------------------------------------------- barra inteira

function readCollapsed() {
  return localStorage.getItem(SIDEBAR_KEY) === "fechada";
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, readCollapsed, () => false);
}

export function setSidebarCollapsed(collapsed: boolean) {
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "fechada" : "aberta");
  // O atributo é o que o CSS lê — o mesmo que o script do `<head>` escreve.
  document.documentElement.dataset.sidebar = collapsed ? "fechada" : "aberta";
  emit();
}

// -------------------------------------------------------- grupos fechados

const EMPTY: string[] = [];

function readClosedGroups(): string[] {
  const raw = localStorage.getItem(CLOSED_GROUPS_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Em cache porque `useSyncExternalStore` compara o retorno por identidade: um
 * array novo a cada leitura faria o React re-renderizar sem parar.
 */
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function closedGroupsSnapshot(): string[] {
  const raw = localStorage.getItem(CLOSED_GROUPS_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = readClosedGroups();
  }
  return cachedValue;
}

export function useClosedGroups() {
  return useSyncExternalStore(subscribe, closedGroupsSnapshot, () => EMPTY);
}

export function toggleGroup(title: string) {
  const current = closedGroupsSnapshot();
  const next = current.includes(title)
    ? current.filter((t) => t !== title)
    : [...current, title];
  localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(next));
  emit();
}
