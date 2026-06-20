import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminHasPermission } from "@/lib/admin/permission-guard";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!adminHasPermission(admin, "admin_roles")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }
    const { id } = await params;
    const { name, description, permissions } = await req.json();
    const role = await prisma.adminRole.update({
      where: { id },
      data: { name, description: description || "", permissions: JSON.stringify(permissions || []) },
    });
    return NextResponse.json({ success: true, data: role });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!adminHasPermission(admin, "admin_roles")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }
    const { id } = await params;
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (role?.isSystem) return NextResponse.json({ success: false, error: "Sistem rolü silinemez" }, { status: 400 });
    const userCount = await prisma.user.count({ where: { adminRoleId: id } });
    if (userCount > 0) return NextResponse.json({ success: false, error: `${userCount} kullanıcı bu role sahip, önce rollerini değiştirin` }, { status: 400 });
    await prisma.adminRole.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
