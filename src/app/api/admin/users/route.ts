import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { adminHasPermission } from "@/lib/admin/permission-guard";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, adminRoleId: true, createdAt: true,
        adminRole: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!adminHasPermission(admin, "admin_users")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }
    const { name, email, password, role, adminRoleId } = await req.json();
    if (!password || String(password).length < 6) {
      return NextResponse.json({ success: false, error: "En az 6 karakter şifre gerekli" }, { status: 400 });
    }
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "user", adminRoleId: adminRoleId || null },
    });
    return NextResponse.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ success: false, error: "Bu email zaten kayıtlı" }, { status: 400 });
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!adminHasPermission(admin, "admin_users")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }
    const { id, name, email, role, adminRoleId, password } = await req.json();
    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (adminRoleId !== undefined) data.adminRoleId = adminRoleId || null;
    if (password) data.password = await hashPassword(password);
    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
