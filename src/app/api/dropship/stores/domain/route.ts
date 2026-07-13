import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { storeId, action } = await req.json();

    if (!storeId || !action) {
      return NextResponse.json({ success: false, error: "storeId ve action gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { id: storeId } });
    if (!store || !store.customDomain) {
      return NextResponse.json({ success: false, error: "Domain talebi bulunamadı" }, { status: 404 });
    }

    if (action === "verify") {
      const { createCnameRecord, findDnsRecord } = await import("@/lib/cloudflare/dns");
      const existing = await findDnsRecord(store.customDomain);
      if (existing) {
        await prisma.dealerStore.update({
          where: { id: storeId },
          data: { customDomainVerified: true },
        });
        return NextResponse.json({ success: true, message: "Domain zaten Cloudflare'de kayıtlı, onaylandı" });
      }

      const result = await createCnameRecord(store.customDomain, `${store.slug}.enaunity.com.tr`);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Cloudflare hatası" }, { status: 500 });
      }

      await prisma.dealerStore.update({
        where: { id: storeId },
        data: { customDomainVerified: true },
      });

      return NextResponse.json({ success: true, message: "CNAME kaydı oluşturuldu, domain onaylandı" });
    }

    if (action === "reject") {
      await prisma.dealerStore.update({
        where: { id: storeId },
        data: { customDomain: "", customDomainVerified: false },
      });
      return NextResponse.json({ success: true, message: "Domain talebi reddedildi" });
    }

    return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
