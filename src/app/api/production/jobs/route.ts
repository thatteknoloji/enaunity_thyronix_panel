import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { prisma } from "@/lib/db";
import {
  createProductionJob,
  getProductionDashboardStats,
  listDealerOrdersForProduction,
  listProductionJobs,
} from "@/lib/production-center/job-service";
import type { CreateProductionJobInput, ProductionJobFilters } from "@/lib/production-center/types";

async function authorizeCreate(body: CreateProductionJobInput) {
  const user = await getSession();
  if (!user) throw new Error("Giriş yapmalısınız");

  const isAdmin = isAdminRole(user.role) || user.role === "admin";
  if (isAdmin) return user;

  if (!user.dealerId) throw new Error("Yetkisiz");

  if (body.dealerOrderId) {
    const order = await prisma.dealerOrder.findFirst({
      where: { id: body.dealerOrderId, dealerId: user.dealerId },
    });
    if (!order) throw new Error("Bayi siparişi bulunamadı");
    return user;
  }

  if (body.coreOrderId) {
    const order = await prisma.order.findFirst({
      where: { id: body.coreOrderId, dealerId: user.dealerId },
    });
    if (!order) throw new Error("Sipariş bulunamadı");
    return user;
  }

  throw new Error("Yetkisiz");
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    if (searchParams.get("dashboard") === "1") {
      const stats = await getProductionDashboardStats();
      return NextResponse.json({ success: true, data: { stats } });
    }

    if (searchParams.get("dealerOrders") === "1") {
      const orders = await listDealerOrdersForProduction(80);
      return NextResponse.json({ success: true, data: { dealerOrders: orders } });
    }

    const filters: ProductionJobFilters = {
      status: searchParams.get("status") || undefined,
      machine: searchParams.get("machine") || undefined,
      operator: searchParams.get("operator") || undefined,
      productType: searchParams.get("productType") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("search") || undefined,
      orderSource: searchParams.get("orderSource") || undefined,
    };
    const jobs = await listProductionJobs(filters);
    return NextResponse.json({ success: true, data: { jobs } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("Giriş") || msg.includes("Yetkisiz") || msg.includes("Forbidden") ? 401 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateProductionJobInput;
    const user = await authorizeCreate(body);
    const payload: CreateProductionJobInput = {
      ...body,
      dealerId: body.dealerId ?? user.dealerId ?? undefined,
    };
    const job = await createProductionJob(payload);
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    let status = 500;
    if (msg.includes("bulunamadı") || msg.includes("zaten var")) status = 404;
    else if (msg.includes("Geçersiz")) status = 400;
    else if (msg.includes("Giriş") || msg.includes("Yetkisiz")) status = 401;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
