import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

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

  const body = await request.json();
  const trip = await prisma.trip.create({
    data: {
      licensePlate: body.licensePlate,
      driverId: body.driverId || null,
      driverName: body.driverName,
      truck: body.truck,
      product: body.product,
      estimatedKg: Number(body.estimatedKg),
      origin: body.origin,
      destination: body.destination,
      status: body.status
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
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ ...trip, updatedAt: trip.updatedAt.toISOString() });
}
