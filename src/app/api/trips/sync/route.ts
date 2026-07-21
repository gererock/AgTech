import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tripSyncRecordSchema, type SyncFailure } from "@/lib/sync-contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await safeReadJson(request);
  const payload = Array.isArray(rawBody) ? { records: rawBody } : rawBody;

  if (!payload || !Array.isArray((payload as any).records)) {
    return NextResponse.json({ error: "Invalid trip sync payload" }, { status: 400 });
  }

  const records = (payload as { records: unknown[] }).records;
  const now = new Date();
  const syncedIds: string[] = [];
  const failedRecords: SyncFailure[] = [];

  for (const item of records) {
    const parsedRecord = tripSyncRecordSchema.safeParse(item);

    if (!parsedRecord.success) {
      failedRecords.push({
        id: (item as any)?.id ?? "unknown",
        error: parsedRecord.error.flatten().formErrors.join("; ") || "Registro inválido"
      });
      continue;
    }

    const record = parsedRecord.data;

    try {
      const existingTrip = await prisma.trip.findUnique({ where: { id: record.id }, select: { id: true } });
      const isNewTrip = !existingTrip;

      if (isNewTrip) {
        const transactionOperations: Array<Prisma.PrismaPromise<unknown>> = [
          prisma.trip.create({
            data: {
              id: record.id,
              truck: record.truck || null,
              licensePlate: record.licensePlate,
              driverId: record.driverId || null,
              driverName: record.driverName,
              origin: record.origin || "Sin informar",
              destination: record.destination || "Sin informar",
              product: record.product,
              estimatedKg: record.estimatedKg,
              loadedKg: record.loadedKg ?? null,
              destinationKg: record.destinationKg ?? null,
              fuelLiters: record.fuelLiters ?? 0,
              fuelItemId: record.fuelItemId || null,
              agroItemId: record.agroItemId || null,
              status: record.status,
              clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
              syncedAt: now
            }
          })
        ];

        if (record.fuelItemId && Number.isFinite(record.fuelLiters) && record.fuelLiters > 0) {
          transactionOperations.push(
            prisma.inventoryItem.updateMany({
              where: { id: record.fuelItemId, type: "FUEL" },
              data: { quantity: { decrement: record.fuelLiters } }
            })
          );
        }

        if (record.agroItemId && Number.isFinite(record.estimatedKg) && record.estimatedKg > 0) {
          transactionOperations.push(
            prisma.inventoryItem.updateMany({
              where: { id: record.agroItemId, type: "AGRO" },
              data: { quantity: { decrement: record.estimatedKg } }
            })
          );
        }

        await prisma.$transaction(transactionOperations);
      } else {
        await prisma.trip.update({
          where: { id: record.id },
          data: {
            truck: record.truck || null,
            licensePlate: record.licensePlate,
            driverId: record.driverId || null,
            driverName: record.driverName,
            origin: record.origin || "Sin informar",
            destination: record.destination || "Sin informar",
            product: record.product,
            estimatedKg: record.estimatedKg,
            loadedKg: record.loadedKg ?? null,
            destinationKg: record.destinationKg ?? null,
            fuelLiters: record.fuelLiters ?? 0,
            fuelItemId: record.fuelItemId || null,
            agroItemId: record.agroItemId || null,
            status: record.status,
            clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
            syncedAt: now
          }
        });
      }

      await prisma.syncLog.create({
        data: {
          entityType: "TRIP",
          entityId: record.id,
          status: "SUCCESS",
          payload: toJsonPayload(record)
        }
      });

      syncedIds.push(record.id);
    } catch (error) {
      console.error(`Trip sync record failed: ${record.id}`, error);
      await prisma.syncLog.create({
        data: {
          entityType: "TRIP",
          entityId: record.id,
          status: "FAILED",
          message: (error as Error)?.message ?? "Trip upsert failed",
          payload: toJsonPayload(record)
        }
      });
      failedRecords.push({
        id: record.id,
        error: (error as Error)?.message ?? "Sync failed"
      });
    }
  }

  return NextResponse.json({
    syncedIds,
    failedRecords: failedRecords.length > 0 ? failedRecords : undefined
  });
}

async function safeReadJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toJsonPayload(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
