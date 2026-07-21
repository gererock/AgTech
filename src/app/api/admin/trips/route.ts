import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { tripCreateSchema } from "@/lib/sync-contracts";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "DRIVER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();

  const conditions: Record<string, unknown>[] = [];

  if (date) {
    conditions.push({
      OR: [
        { createdAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } },
        { updatedAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } }
      ]
    });
  }

  if (status) {
    conditions.push({ status });
  }

  if (search) {
    conditions.push({
      OR: [
        { licensePlate: { contains: search, mode: "insensitive" } },
        { driverName: { contains: search, mode: "insensitive" } },
        { product: { contains: search, mode: "insensitive" } },
        { origin: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } }
      ]
    });
  }

  const trips = await prisma.trip.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      licensePlate: true,
      driverName: true,
      truck: true,
      product: true,
      estimatedKg: true,
      fuelLiters: true,
      fuelItemId: true,
      agroItemId: true,
      origin: true,
      destination: true,
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json(trips.map((trip) => ({ ...trip, updatedAt: trip.updatedAt.toISOString() })));
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN", "DRIVER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const rawBody = await request.json();
  const parsed = tripCreateSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de viaje inválidos",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const trip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        licensePlate: parsed.data.licensePlate,
        driverId: parsed.data.driverId || null,
        driverName: parsed.data.driverName,
        truck: parsed.data.truck || null,
        product: parsed.data.product,
        estimatedKg: parsed.data.estimatedKg,
        origin: parsed.data.origin || "Sin informar",
        destination: parsed.data.destination || "Sin informar",
        fuelLiters: parsed.data.fuelLiters ?? 0,
        fuelItemId: parsed.data.fuelItemId || null,
        agroItemId: parsed.data.agroItemId || null,
        status: parsed.data.status
      },
      select: {
        id: true,
        licensePlate: true,
        driverName: true,
        truck: true,
        product: true,
        estimatedKg: true,
        origin: true,
        destination: true,
        fuelLiters: true,
        fuelItemId: true,
        agroItemId: true,
        status: true,
        updatedAt: true
      }
    });

    if (parsed.data.fuelItemId && parsed.data.fuelLiters > 0) {
      await tx.inventoryItem.updateMany({
        where: { id: parsed.data.fuelItemId, type: "FUEL" },
        data: { quantity: { decrement: parsed.data.fuelLiters } }
      });
    }

    if (parsed.data.agroItemId && parsed.data.estimatedKg > 0) {
      await tx.inventoryItem.updateMany({
        where: { id: parsed.data.agroItemId, type: "AGRO" },
        data: { quantity: { decrement: parsed.data.estimatedKg } }
      });
    }

    return createdTrip;
  });

  return NextResponse.json({ ...trip, updatedAt: trip.updatedAt.toISOString() });
}
