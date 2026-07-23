import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { workOrderSyncRecordSchema, type SyncFailure } from "@/lib/sync-contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await safeReadJson(request);
  const payload = Array.isArray(rawBody) ? { records: rawBody } : rawBody;

  if (!payload || !Array.isArray((payload as any).records)) {
    return NextResponse.json({ error: "Invalid work order sync payload" }, { status: 400 });
  }

  const records = (payload as { records: unknown[] }).records;
  const now = new Date();
  const syncedIds: string[] = [];
  const failedRecords: SyncFailure[] = [];

  for (const item of records) {
    const parsedRecord = workOrderSyncRecordSchema.safeParse(item);

    if (!parsedRecord.success) {
      failedRecords.push({
        id: (item as any)?.id ?? "unknown",
        error: parsedRecord.error.flatten().formErrors.join("; ") || "Registro inválido"
      });
      continue;
    }

    const record = parsedRecord.data;

    try {
      const existingWorkOrder = await prisma.workOrder.findUnique({ where: { id: record.id }, select: { id: true } });
      const isNewWorkOrder = !existingWorkOrder;

      if (isNewWorkOrder) {
        const transactionOperations: Array<Prisma.PrismaPromise<unknown>> = [
          prisma.workOrder.create({
            data: {
              id: record.id,
              machinery: record.machinery,
              operatorId: record.operatorId || null,
              operatorName: record.operatorName,
              hectaresWorked: record.hectaresWorked,
              fuelLiters: record.fuelLiters,
              fuelItemId: record.fuelItemId || null,
              plot: record.plot || "Sin informar",
              customer: record.customer || "Sin informar",
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

        if (record.chemicals?.length) {
          transactionOperations.push(
            prisma.workOrderChemical.createMany({
              data: record.chemicals.map((chemical) => ({
                workOrderId: record.id,
                inventoryItemId: chemical.inventoryItemId || null,
                product: chemical.product,
                quantity: chemical.quantity,
                unit: chemical.unit
              }))
            })
          );

          record.chemicals
            .filter((chemical) => chemical.inventoryItemId && Number.isFinite(chemical.quantity) && chemical.quantity > 0)
            .forEach((chemical) => {
              transactionOperations.push(
                prisma.inventoryItem.updateMany({
                  where: { id: chemical.inventoryItemId || undefined, type: "CHEMICAL" },
                  data: { quantity: { decrement: chemical.quantity } }
                })
              );
            });
        }

        await prisma.$transaction(transactionOperations);
      } else {
        await prisma.workOrder.update({
          where: { id: record.id },
          data: {
            machinery: record.machinery,
            operatorId: record.operatorId || null,
            operatorName: record.operatorName,
            hectaresWorked: record.hectaresWorked,
            fuelLiters: record.fuelLiters,
            fuelItemId: record.fuelItemId || null,
            plot: record.plot || "Sin informar",
            customer: record.customer || "Sin informar",
            clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
            syncedAt: now
          }
        });

        if (record.chemicals?.length) {
          await prisma.workOrderChemical.deleteMany({ where: { workOrderId: record.id } });
          await prisma.workOrderChemical.createMany({
            data: record.chemicals.map((chemical) => ({
              workOrderId: record.id,
              inventoryItemId: chemical.inventoryItemId || null,
              product: chemical.product,
              quantity: chemical.quantity,
              unit: chemical.unit
            }))
          });
        }
      }

      await prisma.syncLog.create({
        data: {
          entityType: "WORK_ORDER",
          entityId: record.id,
          status: "SUCCESS",
          payload: toJsonPayload(record)
        }
      });

      syncedIds.push(record.id);
    } catch (error) {
      console.error(`Work order sync record failed: ${record.id}`, error);
      await prisma.syncLog.create({
        data: {
          entityType: "WORK_ORDER",
          entityId: record.id,
          status: "FAILED",
          message: (error as Error)?.message ?? "Work order upsert failed",
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
