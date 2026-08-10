import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { APP_TIME_ZONE, parseDateOnly, toDateInputValue } from "@/lib/utils";

/**
 * Escopos pedidos no consentimento. `calendar` dá acesso à lista de calendários
 * (a sincronização varre todos), `calendar.events` cria e edita os eventos.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

/** Renova o token um pouco antes de expirar, para não esbarrar no limite no meio de uma sync. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/**
 * Guarda o `state` do OAuth entre o início do fluxo e o callback. Sem conferir
 * esse valor, qualquer um poderia chamar o callback e ligar a agenda dela a
 * outra conta do Google.
 */
export const OAUTH_STATE_COOKIE = "google_oauth_state";

/** Nenhuma conta conectada — a interface deve oferecer "Conectar Google Calendar". */
export class GoogleNotConnectedError extends Error {
  constructor() {
    super("Google Calendar não conectado");
    this.name = "GoogleNotConnectedError";
  }
}

/** O refresh token não vale mais (revogado/expirado): precisa reconectar. */
export class GoogleReauthRequiredError extends Error {
  constructor() {
    super("A conexão com o Google expirou. Conecte novamente.");
    this.name = "GoogleReauthRequiredError";
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada — veja a seção Google Calendar no README.`,
    );
  }
  return value;
}

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
    requiredEnv("GOOGLE_REDIRECT_URI"),
  );
}

/**
 * URL da tela de consentimento. `access_type: offline` + `prompt: consent` são o
 * que garantem um refresh token — sem eles o Google só devolve refresh token na
 * primeiríssima autorização, e reconectar depois deixaria a conta sem como renovar.
 */
export function buildConsentUrl(state: string) {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

/**
 * Cliente autenticado e pronto para uso, renovando o access token quando preciso.
 * Se o refresh falhar, apaga a conexão e pede reconexão.
 */
export async function getAuthClient(): Promise<OAuth2Client> {
  const auth = await prisma.googleAuth.findFirst();
  if (!auth) throw new GoogleNotConnectedError();

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: auth.accessToken,
    refresh_token: auth.refreshToken,
    expiry_date: auth.expiresAt.getTime(),
  });

  const expired = auth.expiresAt.getTime() - TOKEN_REFRESH_MARGIN_MS <= Date.now();
  if (!expired) return oauth2Client;

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    await prisma.googleAuth.update({
      where: { id: auth.id },
      data: {
        accessToken: credentials.access_token ?? auth.accessToken,
        // O Google só reenvia o refresh token de vez em quando; mantém o antigo quando não vem.
        refreshToken: credentials.refresh_token ?? auth.refreshToken,
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3_600_000),
      },
    });

    return oauth2Client;
  } catch {
    // Refresh token inválido: não há como renovar sozinho, então some com a
    // conexão para a interface voltar ao estado "desconectado".
    await prisma.googleAuth.deleteMany({ where: { id: auth.id } });
    throw new GoogleReauthRequiredError();
  }
}

export function calendarClient(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

/**
 * O id do calendário primário é o próprio e-mail da conta — assim dá para mostrar
 * qual conta está conectada sem pedir o escopo `userinfo.email`.
 */
export async function fetchAccountEmail(auth: OAuth2Client): Promise<string | null> {
  const { data } = await calendarClient(auth).calendarList.list({ maxResults: 250 });
  return data.items?.find((c) => c.primary)?.id ?? null;
}

/** Remove a conexão (usado pelo botão "Desconectar"). */
export async function disconnectGoogle() {
  await prisma.googleAuth.deleteMany({});
}

// ---------------------------------------------------------------------------
// Conversão de datas
//
// O app guarda `date` como meia-noite UTC do dia-calendário e `time` como "HH:mm"
// no fuso de São Paulo (ver APP_TIME_ZONE em lib/utils). O Google trabalha com
// RFC3339. Converter com `new Date(...)` cru erraria o dia para eventos de fim de
// tarde, então toda leitura passa por Intl no fuso do app.
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-08-09" + "14:30" → RFC3339 sem offset, para enviar junto de `timeZone`. */
export function buildGoogleDateTime(date: Date, time: string) {
  return `${toDateInputValue(date)}T${time}:00`;
}

/** Um instante do Google → dia-calendário e hora como o app guarda. */
export function googleInstantToApp(isoDateTime: string) {
  const instant = new Date(isoDateTime);
  return {
    date: parseDateOnly(dateFormatter.format(instant))!,
    time: timeFormatter.format(instant),
  };
}

/** "HH:mm" → "HH:mm" uma hora depois, virando o dia se passar da meia-noite. */
export function addOneHour(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = (hours + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Aceita "9:5", "09:05", "09:05:30" e devolve "09:05"; null se não for hora. */
export function normalizeTime(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export { APP_TIME_ZONE };
