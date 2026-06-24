import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { customDomain } = body;

    if (!customDomain) {
      return NextResponse.json({ success: false, error: "Domain adı gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { id } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });

    const { createCnameRecord, findDnsRecord } = await import("@/lib/cloudflare/dns");
    const existing = await findDnsRecord(customDomain);
    if (existing) {
      await prisma.dealerStore.update({
        where: { id },
        data: { customDomain, customDomainVerified: true },
      });
      return NextResponse.json({ success: true, message: "Domain zaten Cloudflare'de kayıtlı, onaylandı" });
    }

    const result = await createCnameRecord(customDomain, `${store.slug}.enaunity.com.tr`);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Cloudflare hatası" }, { status: 500 });
    }

    await prisma.dealerStore.update({
      where: { id },
      data: { customDomain, customDomainVerified: true },
    });

    return NextResponse.json({ success: true, message: "CNAME kaydı oluşturuldu" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const store = await prisma.dealerStore.findUnique({ where: { id } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });

    if (store.customDomain) {
      const { deleteDnsRecord } = await import("@/lib/cloudflare/dns");
      await deleteDnsRecord(store.customDomain);
    }

    await prisma.dealerStore.update({
      where: { id },
      data: { customDomain: "", customDomainVerified: false },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
