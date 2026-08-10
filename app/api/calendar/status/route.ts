import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getGoogleSyncStatus } from "@/lib/agenda";

// Estado da conexão e resumo da última sincronização.
export const GET = route(async () => NextResponse.json(await getGoogleSyncStatus()));
