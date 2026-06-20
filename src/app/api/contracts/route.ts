import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PUBLIC_CONTRACT_TYPES } from "@/lib/pages/public-contracts";

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      where: { active: true, type: { in: [...PUBLIC_CONTRACT_TYPES] } },
      orderBy: [{ title: "asc" }],
      select: { id: true, slug: true, title: true, active: true },
    });
    return NextResponse.json({ success: true, data: contracts });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch contracts" }, { status: 500 });
  }
}
