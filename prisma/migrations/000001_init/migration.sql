-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DRIVER', 'MACHINE_OPERATOR');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('TRIP', 'WORK_ORDER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "truck" TEXT,
    "licensePlate" TEXT NOT NULL,
    "driverId" UUID,
    "driverName" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'Sin informar',
    "destination" TEXT NOT NULL DEFAULT 'Sin informar',
    "product" TEXT NOT NULL,
    "estimatedKg" INTEGER NOT NULL,
    "loadedKg" INTEGER,
    "destinationKg" INTEGER,
    "status" "TripStatus" NOT NULL DEFAULT 'PENDING',
    "clientCreatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" UUID NOT NULL,
    "machinery" TEXT NOT NULL,
    "operatorId" UUID,
    "operatorName" TEXT NOT NULL,
    "initialHourMeter" DOUBLE PRECISION NOT NULL,
    "finalHourMeter" DOUBLE PRECISION NOT NULL,
    "hectaresWorked" DOUBLE PRECISION NOT NULL,
    "fuelLiters" DOUBLE PRECISION NOT NULL,
    "plot" TEXT NOT NULL DEFAULT 'Sin informar',
    "customer" TEXT NOT NULL DEFAULT 'Sin informar',
    "clientCreatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" UUID NOT NULL,
    "entityType" "SyncEntityType" NOT NULL,
    "entityId" UUID,
    "status" "SyncStatus" NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_updatedAt_idx" ON "Trip"("updatedAt");

-- CreateIndex
CREATE INDEX "WorkOrder_operatorId_idx" ON "WorkOrder"("operatorId");

-- CreateIndex
CREATE INDEX "WorkOrder_updatedAt_idx" ON "WorkOrder"("updatedAt");

-- CreateIndex
CREATE INDEX "SyncLog_entityType_entityId_idx" ON "SyncLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
