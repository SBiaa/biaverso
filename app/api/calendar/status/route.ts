import { NextResponse } from "next/server";
import { getGoogleSyncStatus } from "@/lib/agenda";

export const dynamic = "force-dynamic";

// Estado da conexão e resumo da última sincronização.
export async function GET() {
  try {
    return NextResponse.json(await getGoogleSyncStatus());
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Falha ao ler o status",
      },
      { status: 500 },
    );
  }
}
