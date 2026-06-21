import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  MEMBER_REQUIRED_CONTRACTS,
  MEMBER_REQUIRED_DOCUMENTS,
  MEMBER_DOCUMENT_LABELS,
} from "@/lib/members/checklist";
import {
  REGISTRATION_REQUIRED_SLUGS,
  REGISTRATION_OPTIONAL_SLUGS,
} from "@/lib/legal/constants";
import { syncMemberChecklistSnapshot } from "@/lib/members/service";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import { getRequestMetaFromRequest } from "@/lib/legal/request-meta";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const phone = String(formData.get("phone") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const taxNumber = String(formData.get("taxNumber") || "").trim();
    const taxOffice = String(formData.get("taxOffice") || "").trim();
    const acceptedSlugs: string[] = [];
    for (const slug of REGISTRATION_REQUIRED_SLUGS) {
      const key = `accept_${slug.replace(/-/g, "_")}`;
      const ok = formData.get(key) === "true" || formData.get(key) === "on";
      if (!ok) {
        return NextResponse.json({ success: false, error: `Tüm zorunlu sözleşmeleri ayrı ayrı onaylamanız gerekir` }, { status: 400 });
      }
      acceptedSlugs.push(slug);
    }
    for (const slug of REGISTRATION_OPTIONAL_SLUGS) {
      const key = `accept_${slug.replace(/-/g, "_")}`;
      if (formData.get(key) === "true" || formData.get(key) === "on") acceptedSlugs.push(slug);
    }

    const meta = getRequestMetaFromRequest(req);

    for (const type of MEMBER_REQUIRED_DOCUMENTS) {
      const file = formData.get(`document_${type}`) as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json(
          { success: false, error: `${MEMBER_DOCUMENT_LABELS[type]} yüklenmelidir` },
          { status: 400 }
        );
      }
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Bu e-posta zaten kayıtlı" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
        status: "pending",
        phone,
        company,
        taxNumber,
        taxOffice,
        kvkkAcceptedAt: new Date(),
        contractsAcceptedJson: JSON.stringify(acceptedSlugs),
      },
    });

    for (const slug of acceptedSlugs) {
      await recordLegalAcceptance({
        slug,
        userId: user.id,
        email: user.email,
        context: "registration",
        optional: (REGISTRATION_OPTIONAL_SLUGS as readonly string[]).includes(slug),
        meta,
      });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "member-documents", user.id);
    await mkdir(uploadDir, { recursive: true });

    for (const type of MEMBER_REQUIRED_DOCUMENTS) {
      const file = formData.get(`document_${type}`) as File;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "pdf";
      const safeName = `${type}-${Date.now()}.${ext}`;
      await writeFile(path.join(uploadDir, safeName), buffer);
      await prisma.memberDocument.create({
        data: {
          userId: user.id,
          type,
          title: MEMBER_DOCUMENT_LABELS[type],
          fileUrl: `/uploads/member-documents/${user.id}/${safeName}`,
          fileName: file.name,
          fileSize: buffer.length,
          status: "pending",
        },
      });
    }

    await syncMemberChecklistSnapshot(user.id);

    const { attachReferralOnRegistration } = await import("@/lib/partners/referral");
    await attachReferralOnRegistration(user.id).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        message: "Başvurunuz alındı. Evraklarınız incelendikten sonra e-posta ile bilgilendirileceksiniz.",
      },
    });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
