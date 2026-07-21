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
      await prisma.workOrder.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          machinery: record.machinery,
          operatorId: record.operatorId || null,
          operatorName: record.operatorName,
          initialHourMeter: record.initialHourMeter,
          finalHourMeter: record.finalHourMeter,
          hectaresWorked: record.hectaresWorked,
          fuelLiters: record.fuelLiters,
          plot: record.plot || "Sin informar",
          customer: record.customer || "Sin informar",
          clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
          syncedAt: now
        },
        update: {
          machinery: record.machinery,
          operatorId: record.operatorId || null,
          operatorName: record.operatorName,
          initialHourMeter: record.initialHourMeter,
          finalHourMeter: record.finalHourMeter,
          hectaresWorked: record.hectaresWorked,
          fuelLiters: record.fuelLiters,
          plot: record.plot || "Sin informar",
          customer: record.customer || "Sin informar",
          clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
          syncedAt: now
        }
      });

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
