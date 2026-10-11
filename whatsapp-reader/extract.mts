import {
  extractMessageContent,
  getContentType,
  isJidBroadcast,
  isJidGroup,
  isPnUser,
  jidNormalizedUser,
  type proto,
  type WAMessage,
} from "@whiskeysockets/baileys";

/**
 * Interpretação das mensagens do WhatsApp. Só funções puras: nada aqui abre
 * rede nem toca no banco, para dar para testar com mensagens montadas na mão.
 *
 * O leitor é SOMENTE LEITURA. Nada neste diretório envia, apaga, marca como
 * lida ou reage a mensagem — e é para continuar assim.
 */

/** Tipos que não são conversa: confirmações internas, reações, enquetes. */
const IGNORED_TYPES = new Set<string>([
  "protocolMessage",
  "reactionMessage",
  "senderKeyDistributionMessage",
  "pollUpdateMessage",
  "keepInChatMessage",
  "encReactionMessage",
]);

/** O que aparece no lugar do texto quando a mensagem é só mídia. */
const MEDIA_LABELS: Record<string, string> = {
  audioMessage: "[áudio]",
  imageMessage: "[imagem]",
  videoMessage: "[vídeo]",
  stickerMessage: "[figurinha]",
  documentMessage: "[documento]",
  contactMessage: "[contato]",
  contactsArrayMessage: "[contatos]",
  locationMessage: "[localização]",
  liveLocationMessage: "[localização]",
};

export type ParsedMessage = {
  /** Texto, legenda ou o rótulo da mídia ("[áudio]"). Nunca vazio. */
  text: string;
  /** Houve texto de verdade, e não só o rótulo de uma mídia. */
  hasText: boolean;
};

/** Devolve `null` para o que não é conversa e deve ser descartado. */
export function parseMessage(msg: WAMessage): ParsedMessage | null {
  const content = extractMessageContent(msg.message);
  if (!content) return null;

  const type = getContentType(content);
  if (!type || IGNORED_TYPES.has(type)) return null;

  const text = (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    ""
  ).trim();

  if (text) return { text, hasText: true };

  const label = MEDIA_LABELS[type];
  return label ? { text: label, hasText: false } : null;
}

/**
 * Identificador estável da conversa, ou `null` para o que não entra: status,
 * listas de transmissão e canais.
 *
 * Em conversa 1 a 1 o WhatsApp pode entregar o número ou um LID (identificador
 * anônimo). Quando vem o número junto, ele ganha — é o que dá para reconhecer.
 */
export function chatJidOf(key: WAMessage["key"]): string | null {
  const jid = key.remoteJid;
  if (!jid) return null;
  if (isJidBroadcast(jid) || jid.endsWith("@newsletter")) return null;
  if (isJidGroup(jid)) return jid;

  const alt = key.remoteJidAlt;
  return jidNormalizedUser(alt && isPnUser(alt) ? alt : jid);
}

/** "5511999998888@s.whatsapp.net" → "+5511999998888", para nome provisório. */
export function phoneLabel(jid: string) {
  const user = jid.split("@")[0]?.split(":")[0] ?? jid;
  return /^\d+$/.test(user) ? `+${user}` : user;
}

function contextInfoOf(content: proto.IMessage): proto.IContextInfo | undefined {
  for (const value of Object.values(content)) {
    if (value && typeof value === "object" && "contextInfo" in value) {
      return (value as { contextInfo?: proto.IContextInfo | null }).contextInfo ?? undefined;
    }
  }
  return undefined;
}

/**
 * A mensagem fala com você? Vale marcar o seu número (@) ou responder a uma
 * mensagem sua. `myJids` leva o número e o LID da conta, porque em grupo a
 * marcação pode vir de qualquer um dos dois.
 */
export function mentionsMe(msg: WAMessage, myJids: string[]): boolean {
  const content = extractMessageContent(msg.message);
  if (!content) return false;

  const ctx = contextInfoOf(content);
  if (!ctx) return false;

  const mine = new Set(myJids.map((j) => jidNormalizedUser(j)));
  const referenced = [...(ctx.mentionedJid ?? []), ...(ctx.participant ? [ctx.participant] : [])];

  return referenced.some((j) => mine.has(jidNormalizedUser(j)));
}

/** Compila a lista de palavras uma vez: palavra inteira, sem acento nem caixa. */
export function buildKeywordMatcher(words: string[]) {
  const fold = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const escaped = words
    .map((w) => fold(w.trim()))
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escaped.length === 0) return () => false;

  // `\b` não funciona com "R$"; olhar o vizinho resolve para palavra e símbolo.
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`, "u");
  return (text: string) => re.test(fold(text));
}
