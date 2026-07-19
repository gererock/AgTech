import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const workOrders = await prisma.workOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      machinery: true,
      operatorName: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
      customer: true
    }
  });

  return NextResponse.json(workOrders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const workOrder = await prisma.workOrder.create({
    data: {
      machinery: body.machinery,
      operatorName: body.operatorName,
      initialHourMeter: Number(body.initialHourMeter),
      finalHourMeter: Number(body.finalHourMeter),
      hectaresWorked: Number(body.hectaresWorked),
      fuelLiters: Number(body.fuelLiters),
      plot: body.plot,
      customer: body.customer
    },
    select: {
      id: true,
      machinery: true,
      operatorName: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
      customer: true
    }
  });

  return NextResponse.json(workOrder);
}
