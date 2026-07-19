import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { workOrderSyncPayloadSchema } from "@/lib/sync-contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await safeReadJson(request);
  const payload = Array.isArray(rawBody) ? { records: rawBody } : rawBody;
  const parsedPayload = workOrderSyncPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid work order sync payload",
        issues: parsedPayload.error.flatten()
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const syncedIds: string[] = [];

  try {
    await prisma.$transaction(async (transaction) => {
      for (const record of parsedPayload.data.records) {
        const data = {
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
        };

        await transaction.workOrder.upsert({
          where: { id: record.id },
          create: {
            id: record.id,
            ...data
          },
          update: data
        });

        await transaction.syncLog.create({
          data: {
            entityType: "WORK_ORDER",
            entityId: record.id,
            status: "SUCCESS",
            payload: toJsonPayload(record)
          }
        });

        syncedIds.push(record.id);
      }
    });

    return NextResponse.json({ syncedIds });
  } catch (error) {
    console.error("Work order sync failed", error);
    return NextResponse.json({ error: "Work order sync failed" }, { status: 500 });
  }
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
