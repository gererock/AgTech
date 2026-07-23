/*
  Warnings:

  - You are about to drop the column `finalHourMeter` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `initialHourMeter` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "finalHourMeter",
DROP COLUMN "initialHourMeter";
