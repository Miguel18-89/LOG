/*
  Warnings:

  - A unique constraint covering the columns `[store_id]` on the table `Phase1` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[store_id]` on the table `Phase2` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[store_id]` on the table `Provisioning` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Provisioning" ALTER COLUMN "trackingNumber" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Phase1_store_id_key" ON "public"."Phase1"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "Phase2_store_id_key" ON "public"."Phase2"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "Provisioning_store_id_key" ON "public"."Provisioning"("store_id");
