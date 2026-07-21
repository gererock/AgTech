import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const workOrder = await prisma.workOrder.update({
    where: { id: params.id },
    data: {
      machineryId: body.machineryId || null,
      machinery: body.machinery,
      operatorId: body.operatorId || null,
      operatorName: body.operatorName,
      initialHourMeter: Number(body.initialHourMeter),
      finalHourMeter: Number(body.finalHourMeter),
      hectaresWorked: Number(body.hectaresWorked),
      fuelLiters: Number(body.fuelLiters),
      plot: body.plot,
      customerId: body.customerId || null,
      customer: body.customer,
      status: body.status
    },
    select: {
      id: true,
      machineryId: true,
      machinery: true,
      operatorName: true,
      operatorId: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
      customerId: true,
      customer: true,
      status: true
    }
  });

  return NextResponse.json(workOrder);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
