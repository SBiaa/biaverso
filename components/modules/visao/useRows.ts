"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client-api";

/**
 * Estado de uma tabela editável na célula: troca na tela primeiro e desfaz se a
 * gravação falhar (mesmo padrão de `WorkTasksToday`). `local` é o que muda na
 * linha; `body` é o que vai para a rota — costumam ser o mesmo campo, mas a
 * linha pode guardar o dado já "traduzido" (nome do pilar em vez do id).
 */
export function useRows<T extends { id: string }>(initial: T[], endpoint: string) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, local: Partial<T>, body: object = local) {
    const previous = rows;
    setError(null);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...local } : row)));

    try {
      await api.patch(`${endpoint}/${id}`, body);
    } catch (e) {
      setRows(previous);
      setError(errorMessage(e));
    }
  }

  /** Cria no servidor e só então põe a linha na tela (não entra o que não gravou). */
  async function add<Created>(body: object, toRow: (created: Created) => T) {
    setError(null);
    try {
      const created = await api.post<Created>(endpoint, body);
      setRows((prev) => [...prev, toRow(created)]);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  }

  async function remove(id: string) {
    const previous = rows;
    setError(null);
    setRows((prev) => prev.filter((row) => row.id !== id));

    try {
      await api.delete(`${endpoint}/${id}`);
    } catch (e) {
      setRows(previous);
      setError(errorMessage(e));
    }
  }

  return { rows, setRows, error, setError, patch, add, remove };
}
