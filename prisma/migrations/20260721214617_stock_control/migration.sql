-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('FUEL', 'CHEMICAL');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "fuelItemId" UUID,
ADD COLUMN     "fuelLiters" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "fuelItemId" UUID;

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InventoryItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderChemical" (
    "id" UUID NOT NULL,
    "workOrderId" UUID,
    "inventoryItemId" UUID,
    "product" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderChemical_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderChemical_workOrderId_idx" ON "WorkOrderChemical"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderChemical_inventoryItemId_idx" ON "WorkOrderChemical"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_fuelItemId_fkey" FOREIGN KEY ("fuelItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_fuelItemId_fkey" FOREIGN KEY ("fuelItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderChemical" ADD CONSTRAINT "WorkOrderChemical_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderChemical" ADD CONSTRAINT "WorkOrderChemical_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
