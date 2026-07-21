import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { PrismaClient, Role, type Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function GET(request: Request) {
  const auth = await requireRole(["ADMIN", "DRIVER", "MACHINE_OPERATOR"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const role = parseRole(searchParams.get("status"));
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }

  if (role) {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);

  if (!auth.ok) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: auth.status });
  }

  const body = await request.json();
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: hashPassword(body.password ?? "change-me"),
      role: body.role
    },
    select: { id: true, name: true, email: true, role: true }
  });

  return NextResponse.json(user);
}

function parseRole(value: string | null) {
  if (value === Role.ADMIN || value === Role.DRIVER || value === Role.MACHINE_OPERATOR) {
    return value;
  }

  return null;
}
