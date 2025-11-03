/*
  Warnings:

  - Added the required column `originalName` to the `Documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Documents" ADD COLUMN     "originalName" TEXT NOT NULL;
