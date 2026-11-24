import "dotenv/config";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  // Alias porque o lint do React toma qualquer "use…" por hook.
  useMultiFileAuthState as loadAuthState,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import { AUTH_DIR, RETENTION_DAYS, keywords } from "./config.mjs";
import {
  buildKeywordMatcher,
  chatJidOf,
  mentionsMe,
  parseMessage,
} from "./extract.mjs";
import { prisma, purgeOldMessages, recordMessage } from "./store.mjs";

/**
 * Leitor do WhatsApp do biaVerso.
 *
 *   npm run whatsapp
 *
 * Conecta como um "aparelho vinculado" (igual ao WhatsApp Web), grava no banco
 * as mensagens que chegam e as que você manda, e mantém por conversa o instante
 * desde quando alguém espera resposta sua. A página /whatsapp lê daí.
 *
 * SOMENTE LEITURA: este programa não envia, não responde, não marca como lida e
 * não aparece "online". O risco de banimento do número existe mesmo assim —
 * é uma ferramenta não oficial —, mas fica no mínimo possível.
 *
 * Na primeira vez aparece um QR code: WhatsApp no celular > Aparelhos
 * conectados > Conectar um aparelho. Depois a sessão fica em `.whatsapp-auth/`
 * e ele reconecta sozinho.
 */

const isImportant = buildKeywordMatcher(keywords());
const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`);

let sock: WASocket | null = null;
let myJids: string[] = [];
let stopping = false;
let retryDelayMs = 2_000;

/** Nome de grupo (assunto) já consultado, para não perguntar de novo a cada mensagem. */
const groupNames = new Map<string, string>();

/** Fila única: uma mensagem por vez, na ordem em que chegaram. */
let queue: Promise<void> = Promise.resolve();

function toDate(ts: WAMessage["messageTimestamp"]): Date {
  if (typeof ts === "number") return new Date(ts * 1000);
  if (ts && typeof ts === "object" && "toNumber" in ts) return new Date(ts.toNumber() * 1000);
  return new Date();
}

async function groupName(jid: string): Promise<string | null> {
  const cached = groupNames.get(jid);
  if (cached) return cached;
  if (!sock) return null;

  try {
    const meta = await sock.groupMetadata(jid);
    if (meta.subject) groupNames.set(jid, meta.subject);
    return meta.subject || null;
  } catch {
    // Sem o nome o grupo entra com o número; o nome chega na próxima mensagem.
    return null;
  }
}

async function handle(msg: WAMessage) {
  const chatJid = chatJidOf(msg.key);
  const waId = msg.key.id;
  if (!chatJid || !waId) return;

  const parsed = parseMessage(msg);
  if (!parsed) return;

  const sentAt = toDate(msg.messageTimestamp);
  const retentionStart = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  if (sentAt.getTime() < retentionStart) return;

  const fromMe = !!msg.key.fromMe;
  const isGroup = chatJid.endsWith("@g.us");
  const mine = !fromMe && mentionsMe(msg, myJids);

  // pushName é o nome de exibição de quem mandou. Em conversa 1 a 1 é o nome da
  // própria conversa; nas suas mensagens é o seu, e não serve de nome nenhum.
  const pushName = !fromMe ? (msg.pushName ?? null) : null;

  const stored = await recordMessage({
    chatJid,
    isGroup,
    chatName: isGroup ? await groupName(chatJid) : pushName,
    waId,
    fromMe,
    senderName: isGroup && !fromMe ? pushName : null,
    text: parsed.text,
    sentAt,
    important: !fromMe && (mine || (parsed.hasText && isImportant(parsed.text))),
    mentionsMe: mine,
  });

  if (stored) log(`${fromMe ? "→" : "←"} ${isGroup ? "grupo" : "conversa"} gravada`);
}

function enqueue(msg: WAMessage) {
  queue = queue
    .then(() => handle(msg))
    .catch((err) => log(`erro ao gravar mensagem: ${err instanceof Error ? err.message : err}`));
}

async function connect() {
  const { state, saveCreds } = await loadAuthState(AUTH_DIR);

  const socket = makeWASocket({
    auth: state,
    logger: pino({ level: "warn" }),
    browser: Browsers.windows("biaVerso"),
    // Não aparecer "online" faz o celular continuar tocando e notificando.
    markOnlineOnConnect: false,
    // Não pede o histórico completo (pesa, e a retenção é curta). NÃO desligar
    // a sincronização inicial com `shouldSyncHistoryMessage`: sem ela a
    // biblioteca perde o mapeamento de LIDs e a sessão fica instável — o
    // próprio Baileys avisa disso no log.
    syncFullHistory: false,
  });
  sock = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      log("Escaneie o QR code com o WhatsApp do celular (Aparelhos conectados):");
      console.log(await QRCode.toString(qr, { type: "terminal", small: true }));

      // Plano B se o terminal desenhar torto: a mesma imagem em arquivo. O QR
      // vence a cada ~20s e o arquivo é reescrito, então abra logo.
      const file = `${AUTH_DIR}/qr.png`;
      await QRCode.toFile(file, qr, { width: 480, margin: 2 });
      log(`Se o QR acima não escanear, abra o arquivo ${file}.`);
    }

    if (connection === "open") {
      retryDelayMs = 2_000;
      myJids = [socket.user?.id, socket.user?.lid].filter((j): j is string => !!j);
      log(`Conectado como ${socket.user?.name ?? socket.user?.id ?? "?"}. Só leitura.`);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

      if (stopping) return;

      if (code === DisconnectReason.loggedOut) {
        log(
          `Sessão encerrada pelo celular. Apague a pasta ${AUTH_DIR} e rode de novo para escanear outro QR.`,
        );
        await prisma.$disconnect();
        process.exit(1);
      }

      log(`Conexão caiu (código ${code ?? "?"}). Tentando de novo em ${retryDelayMs / 1000}s…`);
      setTimeout(() => void connect(), retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 60_000);
    }
  });

  socket.ev.on("messages.upsert", ({ messages }) => {
    for (const msg of messages) enqueue(msg);
  });
}

async function purge() {
  try {
    const removed = await purgeOldMessages(RETENTION_DAYS);
    if (removed > 0) log(`Retenção: ${removed} mensagens com mais de ${RETENTION_DAYS} dias apagadas.`);
  } catch (err) {
    log(`erro na limpeza: ${err instanceof Error ? err.message : err}`);
  }
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  log("Encerrando…");
  try {
    sock?.end(undefined);
    await queue;
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void purge();
setInterval(() => void purge(), 24 * 60 * 60 * 1000);
void connect();
