import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      productCount,
      orderCount,
      revenueAgg,
      userCount,
      pendingApps,
      pendingReturns,
      pendingReviews,
      pendingApprovals,
      recentOrders,
      allOrdersForCharts,
      partnerAppsTotal,
      allProductsStock,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.user.count(),
      prisma.partnerApplication.count({ where: { status: "pending" } }),
      prisma.returnRequest.count({ where: { status: "pending" } }),
      prisma.review.count({ where: { approved: false } }),
      prisma.order.count({ where: { status: "pending_approval" } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          dealer: { select: { id: true, company: true, name: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: yearStart } },
        select: {
          total: true,
          status: true,
          createdAt: true,
          dealer: { select: { id: true, company: true, name: true } },
          items: { select: { productId: true, quantity: true, price: true, product: { select: { name: true } } } },
        },
      }),
      prisma.partnerApplication.count(),
      prisma.product.findMany({
        select: { id: true, name: true, stock: true, minStockLevel: true, sku: true },
        take: 5000,
      }),
    ]);

    const lowStockProducts = allProductsStock
      .filter((p) => p.minStockLevel > 0 && p.stock <= p.minStockLevel)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const totalRevenue = revenueAgg._sum.total || 0;
    const statusCounts: Record<string, number> = {};
    const monthly: number[] = new Array(12).fill(0);
    let lastMonthRevenue = 0;
    const productStats: Record<string, { name: string; qty: number; revenue: number }> = {};
    const dealerStats: Record<string, { name: string; revenue: number; orders: number }> = {};

    for (const o of allOrdersForCharts) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      const m = new Date(o.createdAt).getMonth();
      monthly[m] += o.total;
      if (m === lastMonth) lastMonthRevenue += o.total;

      for (const it of o.items) {
        const k = it.productId;
        if (!k) continue;
        if (!productStats[k]) productStats[k] = { name: it.product?.name || "", qty: 0, revenue: 0 };
        productStats[k].qty += it.quantity;
        productStats[k].revenue += it.price * it.quantity;
      }

      if (o.dealer) {
        const dk = o.dealer.id;
        if (!dealerStats[dk]) {
          dealerStats[dk] = { name: o.dealer.company || o.dealer.name || "", revenue: 0, orders: 0 };
        }
        dealerStats[dk].revenue += o.total;
        dealerStats[dk].orders += 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          products: productCount,
          orders: orderCount,
          users: userCount,
          revenue: totalRevenue,
          applications: pendingApps,
          partnerApplicationsTotal: partnerAppsTotal,
          lowStock: lowStockProducts.length,
          pendingApprovals,
          pendingReturns,
          pendingReviews,
          lastMonthRevenue,
        },
        recentOrders,
        statusCounts,
        monthlyRevenue: monthly,
        lowStockProducts,
        topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        topDealers: Object.values(dealerStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
