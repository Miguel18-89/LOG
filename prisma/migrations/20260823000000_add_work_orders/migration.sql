-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "client" TEXT NOT NULL,
    "obra" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tasks" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "notes" TEXT,
    "signatureData" TEXT,
    "signedByName" TEXT,
    "signedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderDocument" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrder_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "WorkOrderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeToWorkOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeToWorkOrder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_orderNumber_key" ON "WorkOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "_EmployeeToWorkOrder_B_index" ON "_EmployeeToWorkOrder"("B");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDocument" ADD CONSTRAINT "WorkOrderDocument_workOrder_id_fkey" FOREIGN KEY ("workOrder_id") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDocument" ADD CONSTRAINT "WorkOrderDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToWorkOrder" ADD CONSTRAINT "_EmployeeToWorkOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToWorkOrder" ADD CONSTRAINT "_EmployeeToWorkOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
