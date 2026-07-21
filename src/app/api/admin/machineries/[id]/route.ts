import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const machinery = await prisma.machinery.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      type: body.type?.trim() || null,
      brand: body.brand?.trim() || null,
      identifier: body.identifier?.trim() || null,
      active: body.active ?? true
    },
    select: { id: true, name: true, type: true, brand: true, identifier: true, active: true, createdAt: true, updatedAt: true }
  });

  return NextResponse.json({ ...machinery, createdAt: machinery.createdAt.toISOString(), updatedAt: machinery.updatedAt.toISOString() });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.machinery.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
