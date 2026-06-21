import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncProductCampaigns } from "@/lib/products/campaign-assign";
import { resolveProductSlug } from "@/lib/products/slug";

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
  return { image: main || gallery[0] || "", images: JSON.stringify(gallery.length ? gallery : main ? [main] : []) };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await req.json();
    const { campaignIds, ...raw } = data;
    const imgs = normalizeImages(raw.image, raw.images);
    const slug = await resolveProductSlug(id, String(raw.name || ""), raw.slug);
    const product = await prisma.product.update({
      where: { id },
      data: { ...raw, ...imgs, slug },
    });
    if (Array.isArray(campaignIds)) {
      await syncProductCampaigns(id, campaignIds);
    }
    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
