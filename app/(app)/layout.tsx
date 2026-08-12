import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CalendarSyncPoller } from "@/components/modules/agenda/CalendarSyncPoller";
import { prisma } from "@/lib/prisma";

// A lista de negócios é o único dado de runtime do layout. Enquanto ela era
// aguardada aqui em cima, TODA navegação ficava bloqueada nela: o `loading.tsx`
// de uma rota não cobre o layout que a envolve, então a tela antiga continuava
// congelada até o banco responder. Isolada num filho com Suspense, a navegação
// pinta na hora e só a lista de negócios chega depois.
async function SidebarWithBusinesses() {
  const businesses = await prisma.business.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return <Sidebar businesses={businesses} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <CalendarSyncPoller />
      {/* O fallback é a própria sidebar sem os negócios: os links fixos já
          aparecem no lugar certo e nada salta quando a lista chega. */}
      <Suspense fallback={<Sidebar businesses={[]} />}>
        <SidebarWithBusinesses />
      </Suspense>
      {/* `min-w-0`: sem isso um filho largo (tabela, linha sem quebra) estica o
          item de flex e empurra a sidebar para fora da tela. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
