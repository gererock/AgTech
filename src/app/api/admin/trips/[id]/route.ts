import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DRIVER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const trip = await prisma.trip.update({
    where: { id: params.id },
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
      driverId: true
    }
  });

  return NextResponse.json(trip);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.trip.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
