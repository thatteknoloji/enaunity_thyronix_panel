import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const plans = await prisma.modulePlan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ success: true, data: plans });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { moduleKey, planKey, name, description, monthlyPrice, yearlyPrice, currency, featuresJson, limitsJson, isActive, sortOrder } = body;
  if (!moduleKey || !planKey || !name) return NextResponse.json({ error: "moduleKey, planKey, name zorunlu" }, { status: 400 });
  const plan = await prisma.modulePlan.create({
    data: { moduleKey, planKey, name, description: description || "", monthlyPrice: monthlyPrice || 0, yearlyPrice: yearlyPrice || 0, currency: currency || "TRY", featuresJson: featuresJson || "[]", limitsJson: limitsJson || "{}", isActive: isActive !== false, sortOrder: sortOrder || 0 },
  });
  return NextResponse.json({ success: true, data: plan });
}
