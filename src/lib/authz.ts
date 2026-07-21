import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AppRole = "ADMIN" | "DRIVER" | "MACHINE_OPERATOR";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const sessionCookie = cookies().get("agtech-auth")?.value;
  const userEmail = cookies().get("agtech-user-email")?.value;

  if (sessionCookie !== "true" || !userEmail) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AppRole
  };
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, ok: false, status: 401 as const };
  }

  if (!allowedRoles.includes(user.role)) {
    return { user, ok: false, status: 403 as const };
  }

  return { user, ok: true, status: 200 as const };
}
