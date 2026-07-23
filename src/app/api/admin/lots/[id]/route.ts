import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const lot = await prisma.lot.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      hectares: Number(body.hectares)
    },
    select: { id: true, name: true, hectares: true, createdAt: true, updatedAt: true }
  });

  return NextResponse.json({
    ...lot,
    createdAt: lot.createdAt.toISOString(),
    updatedAt: lot.updatedAt.toISOString()
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.lot.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
