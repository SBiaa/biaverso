-- Cor da clienta no calendário. Nula = cor automática derivada do nome, então
-- ninguém precisa preencher nada pras clientas que já existem.
ALTER TABLE "Client" ADD COLUMN "color" TEXT;
