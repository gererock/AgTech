import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "DRIVER", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();
  const where: Prisma.MachineryWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { type: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { identifier: { contains: search, mode: "insensitive" } }
    ];
  }

  if (status === "active") {
    where.active = true;
  } else if (status === "inactive") {
    where.active = false;
  }

  const machineries = await prisma.machinery.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, brand: true, identifier: true, active: true, createdAt: true, updatedAt: true }
  });

  return NextResponse.json(machineries.map((machinery) => ({ ...machinery, createdAt: machinery.createdAt.toISOString(), updatedAt: machinery.updatedAt.toISOString() })));
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const machinery = await prisma.machinery.create({
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
