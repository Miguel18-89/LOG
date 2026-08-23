-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "updated_by" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
