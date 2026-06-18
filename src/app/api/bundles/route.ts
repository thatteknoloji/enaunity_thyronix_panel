import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const bundles = await prisma.bundle.findMany({
    where: { active: true },
    include: { items: { include: { product: { select: { id: true, name: true, price: true, category: true, image: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: bundles });
}
