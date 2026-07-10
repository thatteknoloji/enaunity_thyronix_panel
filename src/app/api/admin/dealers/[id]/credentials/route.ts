import { NextResponse } from "next/server";
import { hashPassword, requireAdmin, logAdminAction } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: dealerId } = await params;
    const body = await req.json();

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    if (body.action === "create_user_login") {
      const password = String(body.password || "");
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: "En az 6 karakter şifre gerekli" }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { dealerId } });
      if (existing) {
        return NextResponse.json({ success: false, error: "Bu bayinin zaten giriş hesabı var" }, { status: 409 });
      }
      const emailClash = await prisma.user.findUnique({ where: { email: dealer.email } });
      if (emailClash) {
        return NextResponse.json({ success: false, error: "Bu e-posta başka bir hesapta kullanılıyor" }, { status: 409 });
      }
      const now = new Date();
      const user = await prisma.user.create({
        data: {
          email: dealer.email,
          name: dealer.name,
          password: await hashPassword(password),
          role: "dealer",
          status: dealer.status === "active" ? "active" : "pending",
          phone: dealer.phone || "",
          company: dealer.company,
          taxNumber: dealer.taxNumber || "",
          taxOffice: dealer.taxOffice || "",
          dealerId,
          kvkkAcceptedAt: now,
          approvedAt: dealer.status === "active" ? now : null,
          reviewedBy: "admin-credentials",
        },
      });
      await logAdminAction(admin.id, admin.name, "dealer_user_create", user.email, dealerId);
      return NextResponse.json({ success: true, data: { userId: user.id } });
    }

    if (body.action === "update_dealer_email") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return NextResponse.json({ success: false, error: "E-posta gerekli" }, { status: 400 });
      const clash = await prisma.dealer.findFirst({ where: { email, id: { not: dealerId } } });
      if (clash) return NextResponse.json({ success: false, error: "E-posta başka bayide kullanılıyor" }, { status: 400 });
      await prisma.dealer.update({ where: { id: dealerId }, data: { email } });
      await prisma.user.updateMany({ where: { dealerId }, data: { email } });
      await logAdminAction(admin.id, admin.name, "dealer_email_update", dealer.email, email);
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_user_password") {
      const userId = String(body.userId || "");
      const password = String(body.password || "");
      if (!userId || password.length < 6) {
        return NextResponse.json({ success: false, error: "Geçerli kullanıcı ve en az 6 karakter şifre gerekli" }, { status: 400 });
      }
      const user = await prisma.user.findFirst({ where: { id: userId, dealerId } });
      if (!user) return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
      await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(password) } });
      await logAdminAction(admin.id, admin.name, "dealer_user_password_reset", user.email, dealerId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_user_profile") {
      const userId = String(body.userId || "");
      const user = await prisma.user.findFirst({ where: { id: userId, dealerId } });
      if (!user) return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
      const data: Record<string, string> = {};
      if (body.email) data.email = String(body.email).trim().toLowerCase();
      if (body.name) data.name = String(body.name).trim();
      if (body.phone !== undefined) data.phone = String(body.phone);
      if (body.password && String(body.password).length >= 6) {
        data.password = await hashPassword(String(body.password));
      }
      await prisma.user.update({ where: { id: userId }, data });
      await logAdminAction(admin.id, admin.name, "dealer_user_profile_update", user.email, JSON.stringify(data));
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_product_password") {
      const linkId = String(body.linkId || "");
      const password = String(body.password || "");
      if (!linkId || password.length < 6) {
        return NextResponse.json({ success: false, error: "Geçerli link ve en az 6 karakter şifre gerekli" }, { status: 400 });
      }
      const link = await prisma.productAccountLink.findFirst({
        where: { id: linkId, enaUser: { dealerId } },
        include: { externalUser: true },
      });
      if (!link?.externalUser) {
        return NextResponse.json({ success: false, error: "Ürün hesabı bulunamadı" }, { status: 404 });
      }
      await prisma.productExternalUser.update({
        where: { id: link.externalUser.id },
        data: { password: await hashPassword(password) },
      });
      await logAdminAction(admin.id, admin.name, "dealer_product_password_reset", link.externalUser.username, link.productType);
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_subuser_password") {
      const subUserId = String(body.subUserId || "");
      const password = String(body.password || "");
      const sub = await prisma.subUser.findFirst({ where: { id: subUserId, dealerId } });
      if (!sub || password.length < 6) {
        return NextResponse.json({ success: false, error: "Geçersiz alt kullanıcı veya şifre" }, { status: 400 });
      }
      await prisma.subUser.update({ where: { id: subUserId }, data: { password: await hashPassword(password) } });
      await logAdminAction(admin.id, admin.name, "dealer_subuser_password_reset", sub.email, dealerId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
