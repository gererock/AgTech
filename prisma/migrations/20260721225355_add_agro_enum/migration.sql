-- AlterEnum
ALTER TYPE "InventoryItemType" ADD VALUE 'AGRO';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "agroItemId" UUID;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_agroItemId_fkey" FOREIGN KEY ("agroItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
