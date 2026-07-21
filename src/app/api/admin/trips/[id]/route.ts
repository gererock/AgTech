import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DRIVER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const data: Prisma.TripUpdateInput = {};

  if ("licensePlate" in body) data.licensePlate = body.licensePlate;
  if ("driverName" in body) data.driverName = body.driverName;
  if ("truck" in body) data.truck = body.truck || null;
  if ("product" in body) data.product = body.product;
  if ("estimatedKg" in body) data.estimatedKg = Number(body.estimatedKg);
  if ("origin" in body) data.origin = body.origin;
  if ("destination" in body) data.destination = body.destination;
  if ("status" in body) data.status = body.status;
  if ("driverId" in body) {
    data.driver = body.driverId ? { connect: { id: body.driverId } } : { disconnect: true };
  }
  if ("agroItemId" in body) {
    data.agroItem = body.agroItemId ? { connect: { id: body.agroItemId } } : { disconnect: true };
  }

  const trip = await prisma.trip.update({
    where: { id: params.id },
    data,
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
