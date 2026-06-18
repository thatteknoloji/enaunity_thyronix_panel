import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rule = await prisma.thyronixRule.findUnique({ where: { id } });
    if (!rule) return NextResponse.json({ error: "Kural bulunamadı" }, { status: 404 });

    const where: any = {};
    if (rule.operator === "lt") where[rule.field] = { lt: parseFloat(rule.value) };
    else if (rule.operator === "gt") where[rule.field] = { gt: parseFloat(rule.value) };
    else if (rule.operator === "eq") where[rule.field] = rule.value;
    else if (rule.operator === "contains") where[rule.field] = { contains: rule.value, mode: "insensitive" };
    else if (rule.operator === "empty") where[rule.field] = null;

    const count = await prisma.thyronixProduct.count({ where });

    return NextResponse.json({ success: true, data: { count } });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
