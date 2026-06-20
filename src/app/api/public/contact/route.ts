import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, error: "Tüm alanlar zorunludur" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ success: false, error: "Geçerli bir e-posta girin" }, { status: 400 });
    }

    const settings = await prisma.footerSettings.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    const to = map.contact_email || process.env.CONTACT_EMAIL || "info@enaunity.com";

    await sendEmail({
      to,
      subject: `[Enaunity İletişim] ${subject}`,
      html: `
        <h2>Yeni iletişim formu</h2>
        <p><strong>Ad:</strong> ${String(name).trim()}</p>
        <p><strong>E-posta:</strong> ${String(email).trim()}</p>
        <p><strong>Konu:</strong> ${String(subject).trim()}</p>
        <hr/>
        <p>${String(message).trim().replace(/\n/g, "<br/>")}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Mesaj gönderilemedi" }, { status: 500 });
  }
}
