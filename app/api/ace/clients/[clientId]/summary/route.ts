import { NextResponse } from "next/server";
import { ApiError, route } from "@/lib/api";
import { getMonthlyHistory, getPendingItems } from "@/lib/ace";

type Params = { params: Promise<{ clientId: string }> };

export const GET = route(async (request: Request, { params }: Params) => {
  const { clientId } = await params;
  const businessId = new URL(request.url).searchParams.get("businessId");

  if (!businessId) throw new ApiError(400, "businessId e obrigatorio");

  const [monthlyHistory, pending] = await Promise.all([
    getMonthlyHistory(clientId, businessId),
    getPendingItems(clientId, businessId),
  ]);

  return NextResponse.json({ monthlyHistory, pending });
});
