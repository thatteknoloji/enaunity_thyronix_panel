import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MEMBER_REQUIRED_CONTRACTS } from "@/lib/members/checklist";
import { DEALER_REQUIRED_SLUGS, REGISTRATION_REQUIRED_SLUGS } from "@/lib/legal/constants";
import { userMissingRequiredSlugs } from "@/lib/legal/acceptance";
import { computeMemberChecklist, syncMemberChecklistSnapshot } from "@/lib/members/service";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
  if (user.role === "admin") {
    return NextResponse.json({ success: false, error: "Admin hesabı" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { memberDocuments: { orderBy: { createdAt: "desc" } } },
  });
  if (!dbUser) return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

  const checklist = computeMemberChecklist(dbUser, dbUser.memberDocuments);
  const missingLegal = await userMissingRequiredSlugs(user.id, REGISTRATION_REQUIRED_SLUGS);
  const missingDealerLegal = await userMissingRequiredSlugs(user.id, DEALER_REQUIRED_SLUGS);

  return NextResponse.json({
    success: true,
    data: {
      status: dbUser.status,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      company: dbUser.company,
      taxNumber: dbUser.taxNumber,
      taxOffice: dbUser.taxOffice,
      rejectionReason: dbUser.rejectionReason,
      kvkkAccepted: !!dbUser.kvkkAcceptedAt,
      contractsAccepted: !!dbUser.contractsAcceptedJson,
      checklist,
      checklistComplete: checklist.every((c) => c.ok) && missingLegal.length === 0,
      missingLegal,
      missingDealerLegal,
      memberDocuments: dbUser.memberDocuments,
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
    if (user.role === "admin") {
      return NextResponse.json({ success: false, error: "Admin hesabı" }, { status: 400 });
    }

    const body = await req.json();
    const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
    const company = body.company !== undefined ? String(body.company).trim() : undefined;
    const taxNumber = body.taxNumber !== undefined ? String(body.taxNumber).trim() : undefined;
    const taxOffice = body.taxOffice !== undefined ? String(body.taxOffice).trim() : undefined;
    const kvkkAccepted = body.kvkkAccepted === true;
    const contractsAccepted = body.contractsAccepted === true;

    const data: Record<string, unknown> = {};
    if (phone !== undefined) data.phone = phone;
    if (company !== undefined) data.company = company;
    if (taxNumber !== undefined) data.taxNumber = taxNumber;
    if (taxOffice !== undefined) data.taxOffice = taxOffice;
    if (kvkkAccepted) data.kvkkAcceptedAt = new Date();
    if (contractsAccepted) data.contractsAcceptedJson = JSON.stringify([...MEMBER_REQUIRED_CONTRACTS]);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Güncellenecek alan yok" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data });
    await syncMemberChecklistSnapshot(user.id);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { memberDocuments: true },
    });
    const checklist = computeMemberChecklist(dbUser!, dbUser!.memberDocuments);

    return NextResponse.json({
      success: true,
      data: { checklist, checklistComplete: checklist.every((c) => c.ok) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Kayıt başarısız" }, { status: 500 });
  }
}
