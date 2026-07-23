import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const where: Prisma.LotWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } }
    ];
  }

  const lots = await prisma.lot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, hectares: true, createdAt: true, updatedAt: true }
  });

  return NextResponse.json(lots.map((lot) => ({
    ...lot,
    createdAt: lot.createdAt.toISOString(),
    updatedAt: lot.updatedAt.toISOString()
  })));
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const lot = await prisma.lot.create({
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
