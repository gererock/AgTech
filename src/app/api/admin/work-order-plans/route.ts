import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const where: Prisma.WorkOrderPlanWhereInput = {};

  if (auth.user && auth.user.role === "MACHINE_OPERATOR") {
    where.assignedOperatorId = auth.user.id;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { plot: { contains: search, mode: "insensitive" } },
      { customer: { contains: search, mode: "insensitive" } }
    ];
  }

  const plans = await prisma.workOrderPlan.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      plot: true,
      customerId: true,
      customer: true,
      assignedOperatorId: true,
      assignedOperatorName: true,
      instructions: true,
      plannedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return NextResponse.json(plans.map((p) => ({ ...p, plannedAt: p.plannedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();

  const created = await prisma.$transaction(async (tx) => {
    const plan = await tx.workOrderPlan.create({
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

    if (Array.isArray(body.chemicals) && body.chemicals.length > 0) {
      await tx.workOrderPlanChemical.createMany({
        data: body.chemicals.map((c: any) => ({
          workOrderPlanId: plan.id,
          inventoryItemId: c.inventoryItemId || null,
          product: c.product,
          quantity: c.quantity,
          unit: c.unit
        }))
      });
    }

    return plan;
  });

  return NextResponse.json({ ...created, plannedAt: created.plannedAt?.toISOString() ?? null, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() });
}
