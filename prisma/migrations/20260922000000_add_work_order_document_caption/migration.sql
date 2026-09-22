-- AlterTable
-- Coluna anulável: os anexos já carregados ficam com NULL e continuam exatamente
-- como estavam. Nenhuma linha existente é lida ou reescrita.
ALTER TABLE "WorkOrderDocument" ADD COLUMN "caption" TEXT;
