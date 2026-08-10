import { NextResponse } from "next/server";
import { ApiError, route } from "@/lib/api";
import {
  GoogleNotConnectedError,
  GoogleReauthRequiredError,
} from "@/lib/google-calendar";
import { syncCalendarOnce } from "@/lib/sync-calendar";

// Executa a sincronização bidirecional. O polling roda sozinho a cada 5 minutos,
// então nenhuma falha aqui pode derrubar a aplicação.
export const POST = route(async () => {
  try {
    const result = await syncCalendarOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof GoogleNotConnectedError) {
      throw new ApiError(409, error.message);
    }
    if (error instanceof GoogleReauthRequiredError) {
      throw new ApiError(401, error.message);
    }
    throw error;
  }
});
