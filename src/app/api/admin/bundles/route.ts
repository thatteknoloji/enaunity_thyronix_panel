import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const bundles = await prisma.bundle.findMany({
      include: { items: { include: { product: { select: { id: true, name: true, price: true, category: true, image: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: bundles });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, description, price, image, items } = await req.json();
    const bundle = await prisma.bundle.create({
      data: {
        name, description: description || "", price: parseFloat(price) || 0, image: image || "",
        items: { create: (items || []).map((i: any) => ({ productId: i.productId, quantity: i.quantity || 1 })) },
      },
      include: { items: true },
    });
    return NextResponse.json({ success: true, data: bundle });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, name, description, price, image, active, items } = await req.json();
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = parseFloat(price);
    if (image !== undefined) update.image = image;
    if (active !== undefined) update.active = active;

    if (items) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: id } });
      await prisma.bundleItem.createMany({ data: items.map((i: any) => ({ bundleId: id, productId: i.productId, quantity: i.quantity || 1 })) });
    }

    await prisma.bundle.update({ where: { id }, data: update as any });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.bundle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
