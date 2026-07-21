import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

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
      machinery: true,
      operatorName: true,
      initialHourMeter: true,
      finalHourMeter: true,
      hectaresWorked: true,
      fuelLiters: true,
      plot: true,
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

  const body = await request.json();
  const workOrder = await prisma.workOrder.create({
    data: {
      machinery: body.machinery,
      operatorId: body.operatorId || null,
      operatorName: body.operatorName,
      initialHourMeter: Number(body.initialHourMeter),
      finalHourMeter: Number(body.finalHourMeter),
      hectaresWorked: Number(body.hectaresWorked),
      fuelLiters: Number(body.fuelLiters),
      status: body.status,
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
      customer: true,
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ ...workOrder, updatedAt: workOrder.updatedAt.toISOString() });
}
