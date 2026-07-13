import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const payments = await prisma.modulePayment.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ success: true, data: payments });
}
