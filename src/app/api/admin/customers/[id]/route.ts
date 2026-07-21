import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      documentNumber: body.documentNumber?.trim() || null,
      active: body.active ?? true
    },
    select: { id: true, name: true, email: true, phone: true, address: true, documentNumber: true, active: true, createdAt: true, updatedAt: true }
  });

  return NextResponse.json({ ...customer, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
