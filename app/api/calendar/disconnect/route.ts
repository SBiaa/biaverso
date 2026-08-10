import { NextResponse } from "next/server";
import { disconnectGoogle } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// Remove os tokens. Os eventos já sincronizados continuam no app e no Google.
export async function POST() {
  try {
    await disconnectGoogle();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao desconectar",
      },
      { status: 500 },
    );
  }
}
