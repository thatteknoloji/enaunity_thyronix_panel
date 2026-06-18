import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ success: false, error: "productId gerekli" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { productId, approved: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return NextResponse.json({ success: true, data: { reviews, average: Math.round(avg * 10) / 10, count: reviews.length } });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

  const { productId, rating, comment } = await req.json();
  if (!productId || !rating || rating < 1 || rating > 5)
    return NextResponse.json({ success: false, error: "Geçersiz veri" }, { status: 400 });

  await prisma.review.create({ data: { productId, userId: user.id, rating, comment: comment || "" } });
  return NextResponse.json({ success: true, message: "Yorumunuz onay bekliyor" }, { status: 201 });
}
