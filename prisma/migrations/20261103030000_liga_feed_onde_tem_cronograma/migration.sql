-- Liga o módulo Feed nos negócios que já usam o Cronograma, logo depois dele
-- nas abas. Migração separada da que cria o valor 'FEED': o Postgres não deixa
-- usar um valor de enum na mesma transação em que ele foi criado.

-- Abre espaço na ordem logo depois do Cronograma.
UPDATE "BusinessModule" bm
SET "order" = bm."order" + 1
FROM "BusinessModule" c
WHERE c."businessId" = bm."businessId"
  AND c."module" = 'CRONOGRAMA'
  AND c."active" = true
  AND bm."order" > c."order";

INSERT INTO "BusinessModule" ("id", "module", "active", "order", "businessId")
SELECT 'feed_' || c."businessId", 'FEED', true, c."order" + 1, c."businessId"
FROM "BusinessModule" c
WHERE c."module" = 'CRONOGRAMA'
  AND c."active" = true
ON CONFLICT ("businessId", "module") DO NOTHING;
