import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const body = await request.json();
  const trip = await prisma.trip.create({
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
