-- CreateTable
CREATE TABLE "public"."OvertimeRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "entryTime" TEXT NOT NULL,
    "exitTime" TEXT NOT NULL,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "hours50" DOUBLE PRECISION,
    "hours75" DOUBLE PRECISION,
    "hours100" DOUBLE PRECISION,
    "nightType" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "OvertimeRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."OvertimeRecord" ADD CONSTRAINT "OvertimeRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
