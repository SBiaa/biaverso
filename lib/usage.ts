import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { deviceFromUserAgent, normalizeUsagePath } from "@/lib/usage-shared";

/**
 * Rotas que se chamam sozinhas, sem ela ter feito nada: contá-las como ação
 * encheria o registro de "uso" que é só o app trabalhando em segundo plano.
 */
const AUTOMATIC_ROUTES = ["/api/usage", "/api/calendar/sync"];

const ACTION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Anota uma ação (salvar, editar, apagar) depois que a resposta já saiu.
 *
 * Chamado pela casca `route()` de toda rota de API, então cada módulo novo já
 * nasce registrado. Roda em `after`: o registro nunca atrasa a tela, e uma
 * falha nele vira só uma linha no log, nunca um erro para ela.
 */
export function recordAction(request: Request, status: number) {
  if (!ACTION_METHODS.has(request.method) || status >= 400) return;

  const { pathname } = new URL(request.url);
  if (AUTOMATIC_ROUTES.some((route) => pathname.startsWith(route))) return;

  const device = deviceFromUserAgent(request.headers.get("user-agent"));
  const method = request.method;

  try {
    after(async () => {
      try {
        await prisma.usageEvent.create({
          data: { kind: "action", path: normalizeUsagePath(pathname), method, device },
        });
      } catch (error) {
        console.error("[uso] não consegui registrar a ação", error);
      }
    });
  } catch {
    // Fora de uma requisição (script, teste) não há `after`: só não registra.
  }
}
