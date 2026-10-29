// Lógica do pomodoro que não depende de React nem do servidor: relógio,
// estado da pausa (guardado no navegador) e aviso de fim de ciclo.

export type BreakKind = "short" | "long";

export type BreakState = { kind: BreakKind; endsAt: number };

/** O que o cronômetro lembra para recomeçar sem redigitar (foco seguinte). */
export type EntryDetails = {
  categoryId: string;
  title: string;
  description: string;
  projectId: string | null;
  taskId: string | null;
};

const BREAK_KEY = "biaverso:pomodoro-break";
const DETAILS_KEY = "biaverso:time-details";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navegação privada ou armazenamento cheio: a barra funciona sem lembrar.
  }
}

export const loadBreak = () => read<BreakState>(BREAK_KEY);
export const saveBreak = (state: BreakState | null) => write(BREAK_KEY, state);
export const loadDetails = () => read<EntryDetails>(DETAILS_KEY);
export const saveDetails = (details: EntryDetails) => write(DETAILS_KEY, details);

/** "24:59" — contagem regressiva; passa de 1h vira "1:05:00". */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Bipe curto pelo WebAudio — evita carregar um arquivo de som só para isso. */
export function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Sem áudio liberado pelo navegador: o aviso visual basta.
  }
}

/** Notificação do sistema, se ela já deu permissão; senão não incomoda. */
export function systemNotify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Alguns navegadores móveis só aceitam via service worker.
  }
}

export function askNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    // Sem suporte: segue sem notificação do sistema.
  }
}
