import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "DRIVER", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();
  const type = searchParams.get("type")?.trim();

  const conditions: Record<string, unknown>[] = [];

  if (search) {
    conditions.push({ name: { contains: search, mode: "insensitive" } });
  }

  if (status === "active") {
    conditions.push({ active: true });
  } else if (status === "inactive") {
    conditions.push({ active: false });
  }

  if (type === "FUEL" || type === "CHEMICAL" || type === "AGRO") {
    conditions.push({ type });
  }

  const inventory = await prisma.inventoryItem.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
      quantity: true,
      minQuantity: true,
      active: true
    }
  });

  return NextResponse.json(inventory);
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const name = body.name?.trim();
  const type = body.type;
  const unit = body.unit?.trim();
  const quantity = Number(body.quantity ?? 0);
  const minQuantity = Number(body.minQuantity ?? 0);

  if (!name || !unit || (type !== "FUEL" && type !== "CHEMICAL" && type !== "AGRO")) {
    return NextResponse.json({ error: "Datos de inventario inválidos" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name,
      type,
      unit,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      minQuantity: Number.isFinite(minQuantity) ? minQuantity : 0,
      active: body.active ?? true
    }
  });

  return NextResponse.json(item);
}
