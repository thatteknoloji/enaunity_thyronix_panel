import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, monthlyPrice, yearlyPrice, featuresJson, limitsJson, isActive, sortOrder } = body;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (monthlyPrice !== undefined) data.monthlyPrice = monthlyPrice;
  if (yearlyPrice !== undefined) data.yearlyPrice = yearlyPrice;
  if (featuresJson !== undefined) data.featuresJson = featuresJson;
  if (limitsJson !== undefined) data.limitsJson = limitsJson;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const plan = await prisma.modulePlan.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: plan });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.modulePlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
