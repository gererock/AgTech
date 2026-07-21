import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "No disponible" }, { status: 404 });
}
