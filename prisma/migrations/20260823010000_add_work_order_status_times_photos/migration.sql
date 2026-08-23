-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'em_curso',
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "endTime" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderDocument" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'documento';
