-- Pipeline de prospecção: o vínculo cliente-negócio ganha um status a mais
-- (PROSPECT) e os campos que o quadro de prospecção precisa. Nada existente
-- usa PROSPECT ainda, então nenhuma linha muda de status aqui.
ALTER TYPE "ClientStatus" ADD VALUE 'PROSPECT';

CREATE TYPE "ProspectStage" AS ENUM ('NOVO_CONTATO', 'CONTATO_FEITO', 'PROPOSTA_ENVIADA', 'NEGOCIACAO', 'GANHO', 'PERDIDO');

CREATE TYPE "LeadSource" AS ENUM ('INDICACAO', 'PROSPECCAO_ATIVA', 'INSTAGRAM', 'SITE', 'EVENTO', 'OUTRO');

ALTER TABLE "ClientBusiness"
  ADD COLUMN "prospectStage" "ProspectStage",
  ADD COLUMN "source" "LeadSource",
  ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
  ADD COLUMN "lastContactAt" TIMESTAMP(3),
  ADD COLUMN "proposalValue" DOUBLE PRECISION,
  ADD COLUMN "lostReason" TEXT;

CREATE INDEX "ClientBusiness_businessId_nextFollowUpAt_idx" ON "ClientBusiness"("businessId", "nextFollowUpAt");
