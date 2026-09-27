-- QUAIS NEGÓCIOS APARECEM NA BARRA LATERAL
--
-- Com cinco negócios, o grupo "Negócios" virou nove linhas de um menu de vinte
-- e quatro — o maior bloco da barra, e o mais difícil de varrer com o olho.
--
-- `active` não servia para resolver: ela é usada como filtro em quinze telas
-- (o seletor de negócio de uma transação, de uma ideia, de um produto), então
-- desativar um negócio para limpar o menu o faria sumir de todo lugar.
--
-- Esta coluna decide só a barra. Fora dela nada muda, e o negócio continua
-- acessível por "Todos os negócios" e pela busca do Ctrl+K.

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "showInNav" BOOLEAN NOT NULL DEFAULT true;
