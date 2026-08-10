import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";

/**
 * Casca comum das rotas de API.
 *
 * Antes cada rota lia `await request.json()` direto e chamava o Prisma sem rede
 * de proteção: campo faltando ou enum inválido virava 500 com o stack trace do
 * Prisma no corpo da resposta. Aqui o erro é traduzido para um status e uma
 * mensagem em português, e o stack fica só no log do servidor.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageFor(error: unknown): { status: number; message: string } {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    const field = first?.path.join(".");
    return {
      status: 400,
      message: field ? `Campo inválido: ${field} — ${first.message}` : "Dados inválidos.",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return { status: 409, message: "Já existe um registro com esses dados." };
      case "P2003":
        return { status: 409, message: "Esse registro está ligado a outro e não pode ser alterado." };
      case "P2025":
        return { status: 404, message: "Registro não encontrado." };
    }
  }

  return { status: 500, message: "Erro inesperado. Tente de novo." };
}

type Handler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/** Envolve um handler de rota traduzindo exceções em respostas JSON. */
export function route<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const { status, message } = messageFor(error);
      if (status === 500) console.error(`[${request.method} ${request.url}]`, error);
      return NextResponse.json({ error: message }, { status });
    }
  };
}

/** Lê e valida o corpo JSON. Corpo malformado vira 400, não 500. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Corpo da requisição não é um JSON válido.");
  }
  return schema.parse(raw);
}

/** Valida os query params de um GET. */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.output<S> {
  const { searchParams } = new URL(request.url);
  return schema.parse(Object.fromEntries(searchParams));
}
