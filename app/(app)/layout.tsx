import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const businesses = await prisma.business.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar businesses={businesses} />
      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
