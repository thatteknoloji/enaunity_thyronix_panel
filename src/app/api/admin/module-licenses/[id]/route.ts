import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const { status, planKey, trialEndsAt, startsAt, endsAt } = body;

  const data: any = {};
  if (status) data.status = status;
  if (planKey !== undefined) data.planKey = planKey;
  if (trialEndsAt) data.trialEndsAt = new Date(trialEndsAt);
  if (startsAt) data.startsAt = new Date(startsAt);
  if (endsAt) data.endsAt = new Date(endsAt);
  if (status === "ACTIVE" && !data.startsAt) data.startsAt = new Date();

    const license = await prisma.moduleLicense.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: license });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  const { id } = await params;
  await prisma.moduleLicense.delete({ where: { id } });
  return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
