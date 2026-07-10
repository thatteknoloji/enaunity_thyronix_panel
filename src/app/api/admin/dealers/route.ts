import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { normalizeDealerAdminInput } from "@/lib/admin/dealer-admin-input";

export async function GET() {
  try {
    await requireAdmin();
    const dealers = await prisma.dealer.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ success: true, data: dealers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = normalizeDealerAdminInput(body, { requireCoreFields: true }) as Prisma.DealerCreateInput;

    const existing = await prisma.dealer.findUnique({ where: { email: String(data.email) } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu e-posta ile kayıtlı bayi var" }, { status: 409 });
    }

    const loginPassword = String(body.loginPassword || "").trim();
    if (loginPassword && loginPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Giriş şifresi en az 6 karakter olmalı" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: String(data.email) } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "Bu e-posta ile kayıtlı kullanıcı var" }, { status: 409 });
    }

    const dealer = await prisma.dealer.create({ data });

    if (loginPassword) {
      const now = new Date();
      await prisma.user.create({
        data: {
          email: String(data.email),
          name: String(data.name),
          password: await hashPassword(loginPassword),
          role: "dealer",
          status: "active",
          phone: String(data.phone || ""),
          company: String(data.company),
          taxNumber: String(data.taxNumber || ""),
          taxOffice: String(data.taxOffice || ""),
          dealerId: dealer.id,
          kvkkAcceptedAt: now,
          approvedAt: now,
          reviewedBy: "admin-dealer-create",
        },
      });
    }

    return NextResponse.json({ success: true, data: dealer }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "İsim, e-posta ve şirket zorunludur") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
