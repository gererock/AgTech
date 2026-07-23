-- CreateTable
CREATE TABLE "Lot" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_name_key" ON "Lot"("name");
