import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { children: { orderBy: { sortOrder: "asc" } } },
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ success: true, data: categories });
}
