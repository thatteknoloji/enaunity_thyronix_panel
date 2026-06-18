import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, adminNote, rejectedReason } = body;

  const data: any = {};
  if (status) {
    data.status = status;
    if (status === "ACTIVE") data.approvedAt = new Date();
    if (status === "REJECTED") data.rejectedAt = new Date();
  }
  if (adminNote !== undefined) data.adminNote = adminNote;
  if (rejectedReason !== undefined) data.rejectedReason = rejectedReason;

  const approval = await prisma.dealerApproval.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: approval });
}
