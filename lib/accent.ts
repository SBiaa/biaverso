/**
 * A cor de destaque do app, e o que sai dela.
 *
 * Quase tudo que usa o acento já deriva sozinho: `bg-accent/10` para o fundo
 * de um item selecionado, `bg-accent/90` para o hover de um botão. Tailwind
 * calcula essas opacidades em cima da mesma variável, então trocar o tom
 * principal atualiza as variações sem ninguém precisar mexer.
 *
 * O que NÃO deriva é o texto que senta em cima do acento. Ele era `text-white`
 * fixo em doze lugares — o que funciona com o roxo padrão e some se o tom
 * escolhido for claro. Por isso a cor do texto é calculada aqui.
 *
 * Sem dependência de biblioteca de propósito: é uma conta de luminância e o
 * arquivo precisa rodar no servidor e no cliente.
 */

export const DEFAULT_ACCENT = "#6366f1";

/** Tons prontos, para não precisar caçar um hexadecimal para trocar de cor. */
export const ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: "#6366f1", label: "Índigo" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#d946ef", label: "Magenta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#f43f5e", label: "Coral" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#10b981", label: "Verde" },
  { value: "#14b8a6", label: "Turquesa" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#64748b", label: "Grafite" },
];

/** `#abc` e `#aabbcc` viram [r, g, b]. Qualquer outra coisa devolve null. */
export function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Cor válida em formato normalizado, ou o padrão. Nunca estoura. */
export function normalizeAccent(color: string | null | undefined): string {
  if (!color) return DEFAULT_ACCENT;
  const rgb = parseHex(color);
  if (!rgb) return DEFAULT_ACCENT;
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Luminância relativa (WCAG). É o quanto a cor "acende", não o quanto ela é
 * clara no olhômetro: o verde pesa muito mais que o azul na conta.
 */
export function luminance(color: string): number {
  const rgb = parseHex(color) ?? parseHex(DEFAULT_ACCENT)!;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas luminâncias, na fórmula da WCAG. */
function ratio(a: number, b: number): number {
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

const WHITE_LUMINANCE = 1;
const DARK = "#111827";
const DARK_LUMINANCE = luminance(DARK);

/**
 * Branco ou quase-preto por cima do acento — o que der mais contraste.
 *
 * Compara as duas razões em vez de cortar num valor de luminância. A primeira
 * versão usava um limiar fixo e escolhia branco para o âmbar (#f59e0b), que dá
 * 2,1:1 — ilegível. Escuro no mesmo fundo dá 7,8:1. O limiar errava porque a
 * luminância cresce devagar perto do meio da escala e a razão não.
 */
export function accentContrast(color: string): string {
  const l = luminance(color);
  return ratio(l, WHITE_LUMINANCE) >= ratio(l, DARK_LUMINANCE) ? "#ffffff" : DARK;
}

/**
 * O bloco de CSS que o layout injeta. Sai do servidor já com a cor certa,
 * então não existe lampejo de roxo antes da preferência ser aplicada.
 */
export function accentStyle(color: string | null | undefined): string {
  const accent = normalizeAccent(color);
  return `:root{--accent:${accent};--accent-contrast:${accentContrast(accent)}}`;
}
