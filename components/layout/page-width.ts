/**
 * Largura do conteúdo no desktop.
 *
 * Antes cada página escolhia a sua: `max-w-2xl`, `3xl`, `4xl`, `[800px]` ou
 * nenhuma — e metade delas sem `mx-auto`, o que empurrava tudo para a esquerda
 * e deixava um vazio do lado direito. São duas medidas e só:
 *
 * - `wide` — telas que mostram muita coisa ao mesmo tempo (home, dia, listas,
 *   financeiro, painéis de negócio). Larga o bastante para caber três ou
 *   quatro colunas de card num monitor grande.
 * - `narrow` — formulário e leitura corrida, onde a linha longa cansa
 *   (avaliação da semana, detalhe de cliente, configurações de um negócio).
 *
 * A Topbar usa a mesma medida da página que ela encima, senão o título flutua
 * longe do conteúdo que ele nomeia.
 */
export type PageWidth = "wide" | "narrow";

const maxWidth: Record<PageWidth, string> = {
  wide: "max-w-[1800px]",
  narrow: "max-w-3xl",
};

/** Gutter e centralização; o mesmo dos dois lados da barra e do conteúdo. */
export function pageContainer(width: PageWidth = "wide") {
  return `mx-auto w-full ${maxWidth[width]} px-4 md:px-8`;
}

/**
 * Pilha de cards independentes espalhada em colunas.
 *
 * O padrão do app era `space-y-4`: um card por linha, ocupando a largura
 * inteira, todos empilhados. Numa tela de 1600px isso vira uma fila estreita de
 * caixas gigantes com metade do monitor vazio.
 *
 * `items-start` é o que faz funcionar: sem ele o grid estica todo card da
 * linha até a altura do mais alto, e um "Água" de três linhas fica do tamanho
 * de uma lista de tarefas.
 */
export const cardColumns = "grid items-start gap-4 lg:grid-cols-2 lg:gap-6";

/** Idem, para páginas com card curto o bastante para caber três colunas. */
export const cardColumnsDense =
  "grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3 lg:gap-6";

/**
 * Grade de itens (livro, ideia, projeto, negócio, receita): cabem quantos
 * couberem, com no mínimo 240px cada.
 *
 * Escadinha de breakpoint (`sm:2 lg:3 xl:4 …`) não serve aqui por dois motivos:
 * ela mede a *janela*, não o espaço que sobrou depois da sidebar de 240px; e o
 * Tailwind ordena breakpoint customizado antes dos nomeados, então a regra da
 * tela maior saía antes no CSS e a menor ganhava. `auto-fill` não tem nenhum
 * dos dois problemas — mede o container e não depende de ordem.
 */
export const itemGrid =
  "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]";
