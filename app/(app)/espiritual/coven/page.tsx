import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { CardTitle } from "@/components/ui";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { MeetingForm } from "@/components/modules/espiritual/MeetingForm";
import { MeetingCard } from "@/components/modules/espiritual/MeetingCard";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/espiritual";
import { todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CovenPage() {
  const today = todayUtc();
  const [upcoming, past] = await Promise.all([
    getUpcomingMeetings(today),
    getPastMeetings(today),
  ]);

  return (
    <>
      <Topbar title="Coven" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <MeetingForm />

        <section className="space-y-3">
          <CardTitle>O que vem</CardTitle>
          {upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum encontro marcado. Todo encontro criado aqui vira também um
              compromisso na agenda e vai para o Google Calendar.
            </p>
          ) : (
            <div className={itemGrid}>
              {upcoming.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-3">
            <CardTitle>Já aconteceu</CardTitle>
            <div className={itemGrid}>
              {past.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
