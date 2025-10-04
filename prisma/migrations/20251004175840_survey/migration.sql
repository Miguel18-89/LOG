/*
  Warnings:

  - A unique constraint covering the columns `[store_id]` on the table `Survey` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Survey_store_id_key" ON "public"."Survey"("store_id");
