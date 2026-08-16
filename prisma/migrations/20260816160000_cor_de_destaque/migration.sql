-- COR DE DESTAQUE ESCOLHIDA
--
-- O acento era um hexadecimal fixo no globals.css. Quase tudo que o usa já
-- deriva por opacidade (`bg-accent/10` no item selecionado, `bg-accent/90` no
-- hover), entao trocar o tom principal atualiza as variacoes sozinho.
--
-- Fica no banco, e nao no localStorage como o tema: o tema claro/escuro faz
-- sentido mudar por aparelho (escuro no celular à noite), a cor nao — ela é
-- identidade e tem que ser a mesma em todo lugar.

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#6366f1';
