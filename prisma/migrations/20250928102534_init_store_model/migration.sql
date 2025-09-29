-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeNumber" INTEGER NOT NULL,
    "storeAddress" TEXT NOT NULL,
    "storeRegion" TEXT NOT NULL,
    "storeArea" INTEGER NOT NULL,
    "storeInspectorName" TEXT NOT NULL,
    "storeInspectorContact" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeNumber_key" ON "public"."Store"("storeNumber");

-- AddForeignKey
ALTER TABLE "public"."Store" ADD CONSTRAINT "Store_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
