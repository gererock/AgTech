import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const id = params.id;

  const updated = await prisma.$transaction(async (tx) => {
    const plan = await tx.workOrderPlan.update({
      where: { id },
      data: {
        title: body.title?.trim(),
        plot: body.plot?.trim() || "Sin informar",
        customerId: body.customerId || null,
        customer: body.customer || "Sin informar",
        assignedOperatorId: body.assignedOperatorId || null,
        assignedOperatorName: body.assignedOperatorName || null,
        instructions: body.instructions?.trim() || null,
        plannedAt: body.plannedAt ? new Date(body.plannedAt) : null
      }
    });

    if (Array.isArray(body.chemicals)) {
      await tx.workOrderPlanChemical.deleteMany({ where: { workOrderPlanId: id } });
      if (body.chemicals.length > 0) {
        await tx.workOrderPlanChemical.createMany({
          data: body.chemicals.map((c: any) => ({
            workOrderPlanId: id,
            inventoryItemId: c.inventoryItemId || null,
            product: c.product,
            quantity: c.quantity,
            unit: c.unit
          }))
        });
      }
    }

    return plan;
  });

  return NextResponse.json({ ...updated, plannedAt: updated.plannedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.workOrderPlan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
