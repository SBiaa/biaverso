import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { encrypt } from "../lib/crypto.js";
import { phoneLabel } from "./extract.mjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export type IncomingRecord = {
  chatJid: string;
  isGroup: boolean;
  /** Nome conhecido da conversa (assunto do grupo, nome de exibição do contato). */
  chatName: string | null;
  waId: string;
  fromMe: boolean;
  senderName: string | null;
  text: string;
  sentAt: Date;
  important: boolean;
  /** Em grupo, só mensagem que fala com você entra em "esperando". */
  mentionsMe: boolean;
};

export type ChatState = {
  name: string;
  awaitingSince: Date | null;
  lastMessageAt: Date | null;
  lastIncomingAt: Date | null;
  lastOutgoingAt: Date | null;
};

export type ChatUpdate = Partial<{
  name: string;
  lastMessageAt: Date;
  lastIncomingAt: Date;
  lastOutgoingAt: Date;
  awaitingSince: Date | null;
}>;

/**
 * O que muda na conversa quando uma mensagem nova é gravada. Pura, para testar.
 *
 * A regra do `awaitingSince`, que é o que alimenta o quadro:
 *  - mensagem DELA (de fora) abre a espera, se ainda não houver uma aberta;
 *  - mensagem SUA, igual ou posterior, fecha a espera;
 *  - mensagem antiga que chega atrasada, mais velha que a sua última resposta,
 *    não reabre nada — você já tinha respondido por cima dela.
 */
export function chatUpdateFor(
  chat: ChatState,
  rec: Pick<IncomingRecord, "chatName" | "fromMe" | "isGroup" | "mentionsMe" | "sentAt">,
): ChatUpdate {
  const update: ChatUpdate = {};

  if (rec.chatName && rec.chatName !== chat.name) update.name = rec.chatName;
  if (!chat.lastMessageAt || rec.sentAt > chat.lastMessageAt) {
    update.lastMessageAt = rec.sentAt;
  }

  if (rec.fromMe) {
    if (!chat.lastOutgoingAt || rec.sentAt > chat.lastOutgoingAt) {
      update.lastOutgoingAt = rec.sentAt;
    }
    if (chat.awaitingSince && rec.sentAt >= chat.awaitingSince) {
      update.awaitingSince = null;
    }
  } else {
    if (!chat.lastIncomingAt || rec.sentAt > chat.lastIncomingAt) {
      update.lastIncomingAt = rec.sentAt;
    }
    const countsAsWaiting = !rec.isGroup || rec.mentionsMe;
    const alreadyAnswered = !!chat.lastOutgoingAt && rec.sentAt <= chat.lastOutgoingAt;
    if (countsAsWaiting && !chat.awaitingSince && !alreadyAnswered) {
      update.awaitingSince = rec.sentAt;
    }
  }

  return update;
}

/**
 * Grava a mensagem e atualiza o estado da conversa. Devolve `false` quando a
 * mensagem já existia (o WhatsApp reentrega depois de reconectar).
 *
 * Chamar em série: duas mensagens da mesma conversa ao mesmo tempo
 * disputariam o mesmo `awaitingSince`.
 */
export async function recordMessage(rec: IncomingRecord): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.whatsappChat.findUnique({ where: { jid: rec.chatJid } });

    const chat =
      existing ??
      (await tx.whatsappChat.create({
        data: {
          jid: rec.chatJid,
          name: rec.chatName ?? phoneLabel(rec.chatJid),
          isGroup: rec.isGroup,
        },
      }));

    const created = await tx.whatsappMessage.createMany({
      data: [
        {
          waId: rec.waId,
          chatId: chat.id,
          fromMe: rec.fromMe,
          senderName: rec.senderName,
          text: encrypt(rec.text),
          sentAt: rec.sentAt,
          important: rec.important,
        },
      ],
      skipDuplicates: true,
    });
    if (created.count === 0) return false;

    const update = chatUpdateFor(chat, rec);

    if (Object.keys(update).length > 0) {
      await tx.whatsappChat.update({ where: { id: chat.id }, data: update });
    }
    return true;
  });
}

/** Apaga o que passou da retenção. Devolve quantas mensagens saíram. */
export async function purgeOldMessages(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.whatsappMessage.deleteMany({
    where: { sentAt: { lt: cutoff } },
  });
  return count;
}
