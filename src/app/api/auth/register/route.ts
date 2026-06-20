import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password, phone, company, taxNumber, taxOffice, kvkkAccepted } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "Tüm zorunlu alanları doldurun" }, { status: 400 });
    }

    if (!kvkkAccepted) {
      return NextResponse.json({ success: false, error: "KVKK metnini onaylamanız gerekir" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Bu e-posta zaten kayıtlı" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const checklist = {
      emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)),
      identityVerified: String(name).trim().length >= 3,
      companyInfo: !!String(company || "").trim(),
      taxInfo: !!String(taxNumber || "").trim() && !!String(taxOffice || "").trim(),
      phoneVerified: !!String(phone || "").trim(),
      kvkkAccepted: true,
      contractsSigned: false,
      documentsUploaded: false,
    };

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashedPassword,
        role: "user",
        status: "pending",
        phone: String(phone || "").trim(),
        company: String(company || "").trim(),
        taxNumber: String(taxNumber || "").trim(),
        taxOffice: String(taxOffice || "").trim(),
        approvalChecklistJson: JSON.stringify(checklist),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        message: "Başvurunuz alındı. Admin onayından sonra giriş yapabilirsiniz.",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
