import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const approvals = await prisma.dealerApproval.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: approvals });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
