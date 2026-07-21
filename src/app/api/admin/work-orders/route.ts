import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { workOrderCreateSchema } from "@/lib/sync-contracts";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();

  const conditions: Record<string, unknown>[] = [];

  if (date) {
    conditions.push({
      OR: [
        { createdAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } },
        { updatedAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } }
      ]
    });
  }

  if (status) {
    conditions.push({ status });
  }

  if (search) {
    conditions.push({
      OR: [
        { machinery: { contains: search, mode: "insensitive" } },
        { operatorName: { contains: search, mode: "insensitive" } },
        { plot: { contains: search, mode: "insensitive" } },
        { customer: { contains: search, mode: "insensitive" } }
      ]
    });
  }

  const workOrders = await prisma.workOrder.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      machineryId: true,
      machinery: true,
      operatorName: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
      customerId: true,
      customer: true,
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json(workOrders.map((workOrder) => ({ ...workOrder, updatedAt: workOrder.updatedAt.toISOString() })));
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const rawBody = await request.json();
  const parsed = workOrderCreateSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de parte inválidos",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      machineryId: rawBody.machineryId || null,
      machinery: parsed.data.machinery,
      operatorId: parsed.data.operatorId || null,
      operatorName: parsed.data.operatorName,
      initialHourMeter: parsed.data.initialHourMeter,
      finalHourMeter: parsed.data.finalHourMeter,
      hectaresWorked: parsed.data.hectaresWorked,
      fuelLiters: parsed.data.fuelLiters,
      status: parsed.data.status,
      plot: parsed.data.plot || "Sin informar",
      customerId: rawBody.customerId || null,
      customer: parsed.data.customer || "Sin informar"
    },
    select: {
      id: true,
      machineryId: true,
      machinery: true,
      operatorName: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
      customerId: true,
      customer: true,
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ ...workOrder, updatedAt: workOrder.updatedAt.toISOString() });
}
