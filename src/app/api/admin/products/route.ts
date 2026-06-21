import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncProductCampaigns } from "@/lib/products/campaign-assign";
import { ensureProductSlug } from "@/lib/products/slug";

function normalizeImages(image: unknown, images: unknown) {
  let gallery: string[] = [];
  try {
    const parsed = JSON.parse(String(images || "[]"));
    gallery = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    gallery = [];
  }
  const main = String(image || "").trim() || gallery[0] || "";
  if (main && !gallery.includes(main)) gallery.unshift(main);
  if (!main && gallery.length) return { image: gallery[0], images: JSON.stringify(gallery) };
  return { image: main, images: JSON.stringify(gallery.length ? gallery : main ? [main] : []) };
}

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { variants: true } } },
    });
    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = await req.json();
    const { campaignIds, ...raw } = data;
    const imgs = normalizeImages(raw.image, raw.images);
    const slug =
      String(raw.slug || "").trim() ||
      (await ensureProductSlug(String(raw.name || "urun"), String(raw.sku || "")));
    const product = await prisma.product.create({
      data: { ...raw, ...imgs, slug },
    });
    if (Array.isArray(campaignIds) && campaignIds.length) {
      await syncProductCampaigns(product.id, campaignIds);
    }
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
