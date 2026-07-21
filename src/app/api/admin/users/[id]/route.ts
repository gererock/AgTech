import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: body.name,
      email: body.email,
      role: body.role,
      ...(body.password ? { passwordHash: hashPassword(body.password) } : {})
    },
    select: { id: true, name: true, email: true, role: true }
  });

  return NextResponse.json(user);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
