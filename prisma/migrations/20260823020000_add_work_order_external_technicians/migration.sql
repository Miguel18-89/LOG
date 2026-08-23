-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "externalTechnicians" TEXT[] DEFAULT ARRAY[]::TEXT[];
