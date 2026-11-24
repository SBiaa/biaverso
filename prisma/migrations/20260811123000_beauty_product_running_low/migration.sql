-- "Quase acabando" é marcado na mão: não dá para inferir quanto sobrou no pote,
-- e o card da home precisa dessa lista junto com a dos produtos vencendo.

ALTER TABLE "BeautyProduct"
  ADD COLUMN "runningLow" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "BeautyProduct_runningLow_idx" ON "BeautyProduct"("runningLow");
