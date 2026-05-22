import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let db = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = false;
  }

  return NextResponse.json({
    ok: db,
    db,
  });
}
