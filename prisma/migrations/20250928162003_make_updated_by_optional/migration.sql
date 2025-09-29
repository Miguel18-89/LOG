-- AlterTable
ALTER TABLE "public"."Store" ADD COLUMN     "updated_by" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Store" ADD CONSTRAINT "Store_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
