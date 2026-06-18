import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/product-library/types";
import { ensureUniqueSlug } from "@/lib/product-library/access";

export async function GET() {
  try {
    await requireAdmin();
    const suppliers = await prisma.productSupplier.findMany({
      orderBy: { updatedAt: "desc" },
      include: { catalog: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: suppliers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, type, contactName, contactEmail, xmlUrl, notes, catalogId, status } = body;
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Tedarikçi adı zorunlu" }, { status: 400 });
    }
    const slug = await ensureUniqueSlug(slugify(name), "supplier");
    const supplier = await prisma.productSupplier.create({
      data: {
        name: name.trim(),
        slug,
        type: type || "XML",
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        xmlUrl: xmlUrl || "",
        notes: notes || "",
        catalogId: catalogId || null,
        status: status || "ACTIVE",
      },
    });
    return NextResponse.json({ success: true, data: supplier });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
