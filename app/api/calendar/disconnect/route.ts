import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { disconnectGoogle } from "@/lib/google-calendar";

// Remove os tokens. Os eventos já sincronizados continuam no app e no Google.
export const POST = route(async () => {
  await disconnectGoogle();
  return NextResponse.json({ ok: true });
});
