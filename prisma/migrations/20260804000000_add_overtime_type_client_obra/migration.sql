-- AlterTable
ALTER TABLE "public"."OvertimeRecord" ALTER COLUMN "entryTime" DROP NOT NULL,
ALTER COLUMN "exitTime" DROP NOT NULL;

ALTER TABLE "public"."OvertimeRecord" ADD COLUMN     "recordType" TEXT NOT NULL DEFAULT 'trabalho',
ADD COLUMN     "client" TEXT,
ADD COLUMN     "obra" TEXT;
