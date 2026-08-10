"use client";

/**
 * Chamada às rotas de API a partir do cliente.
 *
 * Antes os componentes faziam `await fetch(...)` sem olhar o resultado: se o
 * request falhasse, a UI otimista continuava mostrando o estado novo e só
 * voltava atrás num refresh. Aqui um erro vira exceção com a mensagem que o
 * servidor mandou, para o componente reverter e avisar.
 */

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiRequestError(0, "Sem conexão com o servidor.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? "Não consegui salvar. Tente de novo.";
    throw new ApiRequestError(response.status, message);
  }

  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, json("POST", body)),
  put: <T>(url: string, body: unknown) => request<T>(url, json("PUT", body)),
  patch: <T>(url: string, body: unknown) => request<T>(url, json("PATCH", body)),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

/** Mensagem exibível de um erro vindo do `api`. */
export function errorMessage(error: unknown) {
  return error instanceof ApiRequestError
    ? error.message
    : "Não consegui salvar. Tente de novo.";
}
