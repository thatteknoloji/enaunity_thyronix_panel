import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const approvals = await prisma.dealerApproval.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: approvals });
}
