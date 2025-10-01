/*
  Warnings:

  - You are about to drop the column `storeArea` on the `Store` table. All the data in the column will be lost.
  - Added the required column `message` to the `Comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Comments" ADD COLUMN     "message" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Store" DROP COLUMN "storeArea";
