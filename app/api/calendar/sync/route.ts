import { NextResponse } from "next/server";
import {
  GoogleNotConnectedError,
  GoogleReauthRequiredError,
} from "@/lib/google-calendar";
import { syncCalendarOnce } from "@/lib/sync-calendar";

export const dynamic = "force-dynamic";

// Executa a sincronização bidirecional. Nunca lança: o polling roda sozinho e
// não pode derrubar a aplicação.
export async function POST() {
  try {
    const result = await syncCalendarOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof GoogleNotConnectedError) {
      return NextResponse.json(
        { ok: false, connected: false, error: error.message },
        { status: 409 },
      );
    }

    if (error instanceof GoogleReauthRequiredError) {
      return NextResponse.json(
        { ok: false, connected: false, reauth: true, error: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha na sincronização",
      },
      { status: 500 },
    );
  }
}
