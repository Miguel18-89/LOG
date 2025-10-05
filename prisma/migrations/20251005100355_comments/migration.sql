/*
  Warnings:

  - You are about to drop the column `phase` on the `Comments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Comments" DROP COLUMN "phase",
ADD COLUMN     "created_at" TIMESTAMP(3),
ADD COLUMN     "updated" BOOLEAN DEFAULT false;
