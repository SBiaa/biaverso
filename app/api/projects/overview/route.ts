import { NextResponse } from "next/server";
import { parseQuery, route } from "@/lib/api";
import { getProjectsOverview } from "@/lib/projects";
import { projectsOverviewQuerySchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const { businessId } = parseQuery(request, projectsOverviewQuerySchema);
  return NextResponse.json(await getProjectsOverview(businessId));
});
