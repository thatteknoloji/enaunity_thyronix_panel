import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerType, name, title, email, phone, company, website, location, companySize, markets, portfolio, techLevel, motivation, files, kvkk } = body;

    if (!partnerType || !name || !email || !company || !location || !companySize || !markets || !motivation) {
      return NextResponse.json({ success: false, error: "Gerekli alanları doldurun" }, { status: 400 });
    }

    const application = await prisma.partnerApplication.create({
      data: {
        partnerType, name, title, email, phone, company, website, location, companySize, markets, portfolio, techLevel, motivation, files: JSON.stringify(files || []), kvkk: kvkk || false,
      },
    });

    return NextResponse.json({ success: true, data: application });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
