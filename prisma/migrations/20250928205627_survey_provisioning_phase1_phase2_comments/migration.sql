-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "surveyHasFalseCeilling" BOOLEAN,
    "surveyMetalFalseCeilling" BOOLEAN,
    "surveyCheckoutCount" INTEGER,
    "surveyHasElectronicGates" BOOLEAN,
    "surveyArea" INTEGER,
    "surveyPhase1Date" TIMESTAMP(3),
    "surveyPhase1Type" TEXT,
    "surveyPhase2Date" TIMESTAMP(3),
    "surveyPhase2Type" TEXT,
    "surveyOpeningDate" TIMESTAMP(3),
    "surveyHeadsets" TEXT,
    "surveyHasBread" BOOLEAN,
    "surveyHasChicken" BOOLEAN,
    "surveyHasCodfish" BOOLEAN,
    "surveyHasNewOvens" BOOLEAN,
    "status" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Provisioning" (
    "id" TEXT NOT NULL,
    "ordered" BOOLEAN,
    "trackingNumber" INTEGER,
    "received" BOOLEAN,
    "validated" BOOLEAN,
    "status" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "Provisioning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Phase1" (
    "id" TEXT NOT NULL,
    "cablesSalesArea" BOOLEAN NOT NULL DEFAULT false,
    "cablesBakery" BOOLEAN NOT NULL DEFAULT false,
    "cablesWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "cablesBackoffice" BOOLEAN NOT NULL DEFAULT false,
    "speakersSalesArea" BOOLEAN NOT NULL DEFAULT false,
    "speakersBakery" BOOLEAN NOT NULL DEFAULT false,
    "speakersWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "speakersBackoffice" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "Phase1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Phase2" (
    "id" TEXT NOT NULL,
    "kls" BOOLEAN NOT NULL DEFAULT false,
    "acrylics" BOOLEAN NOT NULL DEFAULT false,
    "hotButtons" BOOLEAN NOT NULL DEFAULT false,
    "eas" BOOLEAN NOT NULL DEFAULT false,
    "tiko" BOOLEAN NOT NULL DEFAULT false,
    "ovens" BOOLEAN NOT NULL DEFAULT false,
    "quailDigital" BOOLEAN NOT NULL DEFAULT false,
    "smc" BOOLEAN NOT NULL DEFAULT false,
    "amplifier" BOOLEAN NOT NULL DEFAULT false,
    "tests" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "Phase2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comments" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisioning" ADD CONSTRAINT "Provisioning_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisioning" ADD CONSTRAINT "Provisioning_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase1" ADD CONSTRAINT "Phase1_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase1" ADD CONSTRAINT "Phase1_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase2" ADD CONSTRAINT "Phase2_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Phase2" ADD CONSTRAINT "Phase2_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
