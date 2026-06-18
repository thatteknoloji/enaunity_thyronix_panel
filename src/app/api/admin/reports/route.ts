import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "12m" ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    // Sales data
    const currentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { notIn: ["cancelled", "pending"] } },
      select: { total: true, discount: true, createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    const prevOrders = await prisma.order.findMany({
      where: { createdAt: { gte: prevSince, lt: since }, status: { notIn: ["cancelled", "pending"] } },
      select: { total: true },
    });

    const totalRevenue = currentOrders.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
    const totalDiscount = currentOrders.reduce((s, o) => s + (o.discount || 0), 0);

    // Daily sales chart
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { revenue: 0, orders: 0 };
    }
    for (const o of currentOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].revenue += o.total;
        dailyMap[key].orders++;
      }
    }

    const salesChart = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));

    // Orders by status
    const allOrders = await prisma.order.groupBy({ by: ["status"], _count: true });
    const ordersByStatus = allOrders.map((o) => ({ status: o.status, count: o._count }));

    // Top products
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });
    const topProductDetails = await Promise.all(
      topProducts.filter((p) => p.productId).map(async (p) => {
        const product = await prisma.product.findUnique({ where: { id: p.productId! }, select: { name: true, image: true } });
        return { name: product?.name || "Silinmiş", image: product?.image || "", quantity: p._sum.quantity || 0, revenue: p._sum.price || 0 };
      })
    );

    // Top dealers
    const dealerSales = await prisma.order.groupBy({
      by: ["dealerId"],
      where: { createdAt: { gte: since }, status: { notIn: ["cancelled", "pending"] }, dealerId: { not: null } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    });
    const topDealers = await Promise.all(
      dealerSales.map(async (d) => {
        const dealer = d.dealerId ? await prisma.dealer.findUnique({ where: { id: d.dealerId }, select: { name: true, company: true } }) : null;
        return { name: dealer?.name || "Silinmiş", company: dealer?.company || "", total: d._sum.total || 0, orders: d._count };
      })
    );

    // Stock summary
    const products = await prisma.product.findMany({ select: { id: true, stock: true, minStockLevel: true } });
    const lowStock = products.filter((p) => p.minStockLevel > 0 && p.stock <= p.minStockLevel).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    const totalStock = products.reduce((s, p) => s + p.stock, 0);

    // Payment summary
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, type: true },
    });
    const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
    const totalPendingBalances = await prisma.dealer.aggregate({ where: { balance: { lt: 0 } }, _sum: { balance: true } });

    // Dealer balance summary
    const dealerBalances = await prisma.dealer.findMany({
      select: { balance: true, creditLimit: true, name: true, company: true },
    });
    const positiveBalance = dealerBalances.filter((d) => d.balance > 0).length;
    const negativeBalance = dealerBalances.filter((d) => d.balance < 0).length;

    // New dealers & customers
    const newDealers = await prisma.dealer.count({ where: { createdAt: { gte: since } } });
    const newUsers = await prisma.user.count({ where: { createdAt: { gte: since }, role: "user" } });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          prevRevenue: Math.round(prevRevenue * 100) / 100,
          revenueChange: prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 10000) / 100 : 100,
          totalOrders: currentOrders.length,
          prevOrders: prevOrders.length,
          orderChange: prevOrders.length > 0 ? Math.round(((currentOrders.length - prevOrders.length) / prevOrders.length) * 10000) / 100 : 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalPayments: Math.round(totalPayments * 100) / 100,
          pendingBalance: Math.round(Math.abs(totalPendingBalances._sum.balance || 0) * 100) / 100,
        },
        salesChart,
        ordersByStatus,
        topProducts: topProductDetails,
        topDealers,
        stockSummary: { lowStock, outOfStock, totalStock, totalProducts: products.length },
        dealerSummary: { total: dealerBalances.length, positiveBalance, negativeBalance },
        newRegistrations: { dealers: newDealers, users: newUsers },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
