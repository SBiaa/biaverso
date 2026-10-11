import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

/**
 * Quadro "Esperando você": conversas do WhatsApp em que a última palavra foi do
 * outro lado e ainda não houve resposta.
 *
 * Quem decide o que entra aqui é o leitor, que preenche `awaitingSince` quando
 * chega uma mensagem e o limpa quando ela responde. Este módulo só lê — e
 * decifra o texto da última mensagem, que é guardado cifrado.
 */

export type WaitingChat = {
  id: string;
  name: string;
  isGroup: boolean;
  clientName: string | null;
  /** Desde quando a primeira mensagem sem resposta chegou. */
  awaitingSince: Date;
  /** Quantas mensagens do outro lado se acumularam sem resposta. */
  unansweredCount: number;
  lastText: string;
  lastSenderName: string | null;
  lastAt: Date;
};

export type WhatsappBoard = {
  chats: WaitingChat[];
  groups: WaitingChat[];
  /** Há alguma mensagem no banco? Distingue "tudo respondido" de "leitor desligado". */
  hasData: boolean;
  lastMessageAt: Date | null;
  /** Instante da leitura, para os tempos de espera de uma mesma tela baterem. */
  now: number;
};

export async function getWhatsappBoard(): Promise<WhatsappBoard> {
  const [waiting, total, latest] = await Promise.all([
    prisma.whatsappChat.findMany({
      where: { ignored: false, awaitingSince: { not: null } },
      orderBy: { awaitingSince: "asc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.whatsappMessage.count(),
    prisma.whatsappMessage.findFirst({
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
  ]);

  const rows = await Promise.all(
    waiting.map(async (chat): Promise<WaitingChat> => {
      const since = chat.awaitingSince as Date;
      const incoming = { chatId: chat.id, fromMe: false, sentAt: { gte: since } };

      const [unansweredCount, last] = await Promise.all([
        prisma.whatsappMessage.count({ where: incoming }),
        prisma.whatsappMessage.findFirst({
          where: incoming,
          orderBy: { sentAt: "desc" },
          select: { text: true, senderName: true, sentAt: true },
        }),
      ]);

      return {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        clientName: chat.client?.name ?? null,
        awaitingSince: since,
        unansweredCount,
        lastText: last ? decrypt(last.text) : "",
        lastSenderName: last?.senderName ?? null,
        lastAt: last?.sentAt ?? since,
      };
    }),
  );

  return {
    chats: rows.filter((r) => !r.isGroup),
    groups: rows.filter((r) => r.isGroup),
    hasData: total > 0,
    lastMessageAt: latest?.sentAt ?? null,
    now: Date.now(),
  };
}
