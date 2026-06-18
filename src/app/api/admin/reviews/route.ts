import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const reviews = await prisma.review.findMany({
    include: { product: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: reviews });
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const { id, approved } = await req.json();
  await prisma.review.update({ where: { id }, data: { approved } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { id } = await req.json();
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
