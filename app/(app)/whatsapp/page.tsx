import { MessageCircle } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { cardColumns } from "@/components/layout/page-width";
import { Card } from "@/components/ui";
import { WaitingList } from "@/components/modules/whatsapp/WaitingList";
import { getWhatsappBoard } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  const board = await getWhatsappBoard();
  const { now } = board;

  return (
    <>
      <Topbar title="WhatsApp" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        {!board.hasData ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageCircle size={28} className="text-emerald-600" />
            <p className="text-sm font-medium text-text-primary">
              Ainda não chegou nenhuma mensagem.
            </p>
            <p className="max-w-sm text-xs text-text-secondary">
              Este quadro mostra quem está esperando resposta sua. Ele se
              preenche quando o leitor do WhatsApp estiver conectado.
            </p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              Conversas em que a última palavra foi do outro lado, da que está
              esperando há mais tempo para a mais recente.
              {board.lastMessageAt
                ? ` Última mensagem lida: ${board.lastMessageAt.toLocaleString("pt-BR")}.`
                : ""}
            </p>

            <div className={cardColumns}>
              <WaitingList title="Conversas" chats={board.chats} now={now} />
              <WaitingList title="Grupos" chats={board.groups} now={now} group />
            </div>
          </>
        )}
      </main>
    </>
  );
}
