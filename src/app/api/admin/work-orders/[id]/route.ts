import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const workOrder = await prisma.workOrder.update({
    where: { id: params.id },
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
