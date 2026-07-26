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
  const workOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.workOrder.update({
      where: { id: params.id },
      data: {
        machineryId: body.machineryId || null,
        machinery: body.machinery,
        operatorId: body.operatorId || null,
        operatorName: body.operatorName,
        workOrderPlanId: body.workOrderPlanId || null,
        hectaresWorked: Number(body.hectaresWorked),
        fuelLiters: Number(body.fuelLiters),
        fuelItemId: body.fuelItemId || null,
        plot: body.plot
      },
      select: {
        id: true,
        machineryId: true,
        machinery: true,
        operatorName: true,
        operatorId: true,
        workOrderPlanId: true,
        hectaresWorked: true,
        fuelLiters: true,
        fuelItemId: true,
        plot: true
      }
    });

    if (Array.isArray(body.chemicals)) {
      await tx.workOrderChemical.deleteMany({ where: { workOrderId: params.id } });
      if (body.chemicals.length > 0) {
        await tx.workOrderChemical.createMany({
          data: body.chemicals.map((chemical: any) => ({
            workOrderId: params.id,
            inventoryItemId: chemical.inventoryItemId || null,
            product: chemical.product,
            quantity: Number(chemical.quantity),
            unit: chemical.unit
          }))
        });
      }
    }

    return updated;
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
