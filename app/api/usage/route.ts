import { z } from "zod";
import { route, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { DEVICES, NAV_SOURCES, normalizeUsagePath } from "@/lib/usage-shared";

const viewSchema = z.object({
  path: z.string().min(1).max(300),
  device: z.enum(DEVICES),
  source: z.enum(NAV_SOURCES),
  sessionId: z.string().min(1).max(64),
});

/** Uma visita a uma tela, mandada pelo `UsageTracker` a cada troca de rota. */
export const POST = route(async (request) => {
  const view = await parseBody(request, viewSchema);

  await prisma.usageEvent.create({
    data: {
      kind: "view",
      path: normalizeUsagePath(view.path),
      device: view.device,
      source: view.source,
      sessionId: view.sessionId,
    },
  });

  return new Response(null, { status: 204 });
});
