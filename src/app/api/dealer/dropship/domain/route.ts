import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

async function requireDropshipAccess() {
  const user = await requireDealer();
  const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
  if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
  return user;
}

export async function POST(req: Request) {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;
    const { customDomain } = await req.json();

    if (!customDomain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(customDomain)) {
      return NextResponse.json({ success: false, error: "Geçerli bir domain girin" }, { status: 400 });
    }

    const existing = await prisma.dealerStore.findFirst({
      where: { customDomain, customDomainVerified: true },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu domain başka bir mağazaya bağlı" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.dealerStore.update({
      where: { dealerId },
      data: { customDomain, customDomainVerified: false },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store || !store.customDomain) {
      return NextResponse.json({ success: false, error: "Domain bağlı değil" }, { status: 400 });
    }

    if (store.customDomainVerified) {
      const { deleteDnsRecord, findDnsRecord } = await import("@/lib/cloudflare/dns");
      const record = await findDnsRecord(store.customDomain);
      if (record) await deleteDnsRecord(record.id);
    }

    await prisma.dealerStore.update({
      where: { dealerId },
      data: { customDomain: "", customDomainVerified: false },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
