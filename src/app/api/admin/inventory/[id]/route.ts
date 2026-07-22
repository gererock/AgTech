import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const data: any = {};

  if ("name" in body) data.name = body.name?.trim();
  if ("type" in body && (body.type === "FUEL" || body.type === "CHEMICAL" || body.type === "AGRO")) data.type = body.type;
  if ("unit" in body) data.unit = body.unit?.trim();
  if ("restockAmount" in body) {
    const restockAmount = Number(body.restockAmount);
    if (Number.isNaN(restockAmount) || restockAmount <= 0) {
      return NextResponse.json({ error: "Cantidad de reabastecimiento inválida" }, { status: 400 });
    }
    data.quantity = { increment: restockAmount };
  } else if ("quantity" in body) {
    data.quantity = Number(body.quantity);
  }
  if ("minQuantity" in body) data.minQuantity = Number(body.minQuantity);
  if ("active" in body) data.active = Boolean(body.active);

  const inventoryItem = await prisma.inventoryItem.update({
    where: { id: params.id },
    data
  });

  return NextResponse.json(inventoryItem);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.inventoryItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
