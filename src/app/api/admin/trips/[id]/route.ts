import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const trip = await prisma.trip.update({
    where: { id: params.id },
    data: {
      licensePlate: body.licensePlate,
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
      status: true
    }
  });

  return NextResponse.json(trip);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.trip.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
