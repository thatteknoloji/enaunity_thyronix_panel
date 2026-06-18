import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerBalance, mapAccountTxToLegacyShape } from "@/lib/accounting/accounting-service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user?.dealerId) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });

    const [dealer, orders, quotes, returns, accountTxs, notifications] = await Promise.all([
      prisma.dealer.findUnique({ where: { id: user.dealerId }, include: { paymentTerm: true } }),
      prisma.order.findMany({ where: { dealerId: user.dealerId }, include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.quote.findMany({ where: { dealerId: user.dealerId, status: "pending" }, select: { id: true } }),
      prisma.returnRequest.findMany({ where: { dealerId: user.dealerId, status: "pending" }, select: { id: true } }),
      prisma.dealerAccountTransaction.findMany({ where: { dealerId: user.dealerId }, orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.notification.findMany({ where: { dealerId: user.dealerId, read: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    const balanceInfo = await getDealerBalance(dealer.id);
    const transactions = accountTxs.map(mapAccountTxToLegacyShape);

    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

    let thisMonthTotal = 0, lastMonthTotal = 0, thisMonthCount = 0;
    const monthlyData: number[] = new Array(6).fill(0);
    const monthLabels: string[] = [];
    const monthOrderCounts: number[] = new Array(6).fill(0);
    const categoryData: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString("tr-TR", { month: "short" }));
    }

    const productOrderCount: Record<string, { name: string; qty: number; revenue: number }> = {};

    orders.forEach(o => {
      const m = new Date(o.createdAt).getMonth();
      const diff = (now.getFullYear() - new Date(o.createdAt).getFullYear()) * 12 + m - thisMonth;
      const idx = 5 + diff;
      if (idx >= 0 && idx < 6) { monthlyData[idx] += o.total; monthOrderCounts[idx]++; }

      if (m === thisMonth) { thisMonthTotal += o.total; thisMonthCount++; }
      if (m === lastMonth) lastMonthTotal += o.total;

      o.items.forEach(item => {
        if (!item.product || !item.productId) return;
        const cat = item.product.category;
        categoryData[cat] = (categoryData[cat] || 0) + item.quantity;
        const pid = item.productId;
        if (!productOrderCount[pid]) productOrderCount[pid] = { name: item.product.name, qty: 0, revenue: 0 };
        productOrderCount[pid].qty += item.quantity;
        productOrderCount[pid].revenue += item.price * item.quantity;
      });
    });

    const pendingApprovals = orders.filter(o => o.status === "pending_approval").length;
    const recentOrders = orders.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        dealer: {
          id: dealer.id, name: dealer.name, company: dealer.company, email: dealer.email,
          discountRate: dealer.discountRate, group: dealer.group,
          creditLimit: balanceInfo.creditLimit, balance: balanceInfo.balance,
          availableLimit: balanceInfo.availableLimit, riskLevel: balanceInfo.riskLevel,
          allowNegative: dealer.allowNegative, status: dealer.status,
          paymentTerm: dealer.paymentTerm,
        },
        stats: {
          thisMonthTotal, lastMonthTotal, thisMonthCount,
          totalOrders: orders.length,
          pendingApprovals,
          pendingQuotes: quotes.length,
          pendingReturns: returns.length,
          unreadNotifications: notifications.length,
        },
        charts: { monthlyData, monthLabels, monthOrderCounts, categoryData },
        recentOrders: recentOrders.map(o => ({
          id: o.id, orderNo: o.id, total: o.total, status: o.status, createdAt: o.createdAt,
          items: o.items.slice(0, 3).map(i => ({ name: i.product?.name || i.name || "Ürün", qty: i.quantity })),
          itemCount: o.items.length,
        })),
        topProducts: Object.values(productOrderCount).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(p => ({ ...p, sold: p.qty })),
        recentTransactions: transactions.map(t => ({
          id: t.id, type: t.type, amount: t.amount, note: t.note, balanceAfter: t.balanceAfter, createdAt: t.createdAt,
        })),
        notifications,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
