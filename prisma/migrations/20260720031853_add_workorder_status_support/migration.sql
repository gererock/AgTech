-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING';
