import { NextResponse } from "next/server";
import { getMonthlyHistory, getPendingItems } from "@/lib/ace";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "businessId é obrigatório" }, { status: 400 });
  }

  const [monthlyHistory, pending] = await Promise.all([
    getMonthlyHistory(clientId, businessId),
    getPendingItems(clientId, businessId),
  ]);

  return NextResponse.json({ monthlyHistory, pending });
}
