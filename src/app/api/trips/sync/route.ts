import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tripSyncPayloadSchema } from "@/lib/sync-contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await safeReadJson(request);
  const payload = Array.isArray(rawBody) ? { records: rawBody } : rawBody;
  const parsedPayload = tripSyncPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid trip sync payload",
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
          status: record.status,
          clientCreatedAt: record.createdAt ? new Date(record.createdAt) : null,
          syncedAt: now
        };

        await transaction.trip.upsert({
          where: { id: record.id },
          create: {
            id: record.id,
            ...data
          },
          update: data
        });

        await transaction.syncLog.create({
          data: {
            entityType: "TRIP",
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
    console.error("Trip sync failed", error);
    return NextResponse.json({ error: "Trip sync failed" }, { status: 500 });
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
