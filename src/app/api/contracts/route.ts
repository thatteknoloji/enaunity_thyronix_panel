import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, active: true },
    });
    return NextResponse.json({ success: true, data: contracts });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch contracts" }, { status: 500 });
  }
}
