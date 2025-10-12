-- DropForeignKey
ALTER TABLE "public"."Comments" DROP CONSTRAINT "Comments_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Phase1" DROP CONSTRAINT "Phase1_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Phase2" DROP CONSTRAINT "Phase2_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Provisioning" DROP CONSTRAINT "Provisioning_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Survey" DROP CONSTRAINT "Survey_store_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisioning" ADD CONSTRAINT "Provisioning_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase1" ADD CONSTRAINT "Phase1_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase2" ADD CONSTRAINT "Phase2_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
