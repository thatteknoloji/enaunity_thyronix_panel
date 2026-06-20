import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminHasPermission } from "@/lib/admin/permission-guard";

export async function GET() {
  try {
    await requireAdmin();
    const roles = await prisma.adminRole.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: roles });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!adminHasPermission(admin, "admin_roles")) {
      return NextResponse.json({ success: false, error: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }
    const { name, description, permissions } = await req.json();
    const role = await prisma.adminRole.create({
      data: { name, description: description || "", permissions: JSON.stringify(permissions || []) },
    });
    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ success: false, error: "Bu isimde bir rol zaten var" }, { status: 400 });
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
