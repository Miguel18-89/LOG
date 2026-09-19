-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "client" TEXT,
    "location" TEXT,
    "requestedBy" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "expectedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "closingNote" TEXT,
    "closedAt" TIMESTAMP(3),
    "assignee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEntry" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT,
    "field" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "TicketEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketDocument" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'documento',
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticket_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "TicketDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- AlterTable
-- Colunas anuláveis: as obras e os RMAs já registados ficam com NULL e continuam
-- exatamente como estavam. Nenhuma linha existente é lida ou reescrita.
ALTER TABLE "WorkOrder" ADD COLUMN "ticket_id" TEXT;
ALTER TABLE "RMA" ADD COLUMN "ticket_id" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEntry" ADD CONSTRAINT "TicketEntry_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEntry" ADD CONSTRAINT "TicketEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDocument" ADD CONSTRAINT "TicketDocument_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDocument" ADD CONSTRAINT "TicketDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RMA" ADD CONSTRAINT "RMA_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
