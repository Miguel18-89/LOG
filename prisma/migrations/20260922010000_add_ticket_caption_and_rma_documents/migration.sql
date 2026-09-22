-- AlterTable
-- Coluna anulável: os anexos de tickets já carregados ficam com NULL e continuam
-- exatamente como estavam.
ALTER TABLE "TicketDocument" ADD COLUMN "caption" TEXT;

-- CreateTable
-- Os RMAs não tinham anexos; esta tabela nasce vazia e nada existente é tocado.
CREATE TABLE "RMADocument" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'documento',
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "caption" TEXT,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rma_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "RMADocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RMADocument" ADD CONSTRAINT "RMADocument_rma_id_fkey" FOREIGN KEY ("rma_id") REFERENCES "RMA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RMADocument" ADD CONSTRAINT "RMADocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
