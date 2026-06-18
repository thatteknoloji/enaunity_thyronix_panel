import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const dealers = await prisma.dealer.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        balance: true,
        creditLimit: true,
        paymentTerm: { select: { days: true, rate: true } },
        orders: {
          where: {
            status: { notIn: ["cancelled", "delivered"] },
          },
          select: {
            id: true,
            total: true,
            discount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const now = new Date();

    const agingData = dealers.map(dealer => {
      const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      let totalOutstanding = 0;

      for (const order of dealer.orders) {
        const termDays = dealer.paymentTerm?.days || 0;
        const dueDate = new Date(order.createdAt);
        dueDate.setDate(dueDate.getDate() + termDays);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) continue;

        const amount = order.total - order.discount;
        totalOutstanding += amount;

        if (daysOverdue <= 30) buckets["0-30"] += amount;
        else if (daysOverdue <= 60) buckets["31-60"] += amount;
        else if (daysOverdue <= 90) buckets["61-90"] += amount;
        else buckets["90+"] += amount;
      }

      return {
        dealerId: dealer.id,
        dealerName: dealer.name,
        company: dealer.company,
        balance: dealer.balance,
        creditLimit: dealer.creditLimit,
        totalOutstanding,
        buckets,
      };
    }).filter(d => d.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totals = agingData.reduce((acc, d) => {
      acc.totalOutstanding += d.totalOutstanding;
      acc["0-30"] += d.buckets["0-30"];
      acc["31-60"] += d.buckets["31-60"];
      acc["61-90"] += d.buckets["61-90"];
      acc["90+"] += d.buckets["90+"];
      return acc;
    }, { totalOutstanding: 0, "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 });

    return NextResponse.json({
      success: true,
      data: { dealers: agingData, totals },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
