import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { accentStyle } from "@/lib/accent";
import { getUserSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "biaVerso",
  description: "Central de gestão pessoal — rotina, finanças e negócios",
};

/**
 * Aplica o tema salvo antes da primeira pintura.
 *
 * O servidor não tem como saber a preferência, então o HTML sai sempre no
 * claro. Se a troca esperasse o React montar, cada carregamento no tema escuro
 * começaria com um lampejo de tela branca. Este script roda antes do body.
 *
 * O `try` existe porque `localStorage` estoura em janela anônima com cookies
 * bloqueados — e um erro aqui derrubaria a página inteira antes dela abrir.
 */
const themeScript = `
try {
  var escolha = localStorage.getItem("biaverso:tema") || "sistema";
  var escuro = escolha === "escuro" || (escolha === "sistema" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
  document.documentElement.dataset.sidebar =
    localStorage.getItem("biaverso:barra") === "fechada" ? "fechada" : "aberta";
} catch (e) {
  document.documentElement.dataset.theme = "light";
  document.documentElement.dataset.sidebar = "aberta";
}
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Uma leitura por chave primária numa tabela de uma linha. Vale a pena: com
  // a cor vindo do servidor já no HTML, não existe lampejo do tom padrão antes
  // da preferência ser aplicada — que é o que aconteceria lendo no cliente.
  const { accentColor } = await getUserSettings();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
      // `data-theme` já sai do servidor para o CSS ter um valor válido mesmo
      // se o script abaixo não rodar; ele corrige em seguida, antes da pintura.
      data-theme="light"
      data-sidebar="aberta"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* O valor é validado como hexadecimal na entrada (settingsPatchSchema)
            e normalizado de novo aqui, então nada além de uma cor chega a virar
            texto dentro da folha de estilo. */}
        <style dangerouslySetInnerHTML={{ __html: accentStyle(accentColor) }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        {/* Os dois são "use client", mas recebem `children` já renderizados no
            servidor — nada da árvore de páginas vira client por causa deles. */}
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
