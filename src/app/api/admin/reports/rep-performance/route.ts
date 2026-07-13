import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, name: true, email: true },
    });
    const assignments = await prisma.dealerAssignment.findMany({
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            company: true,
            orders: {
              select: { id: true, total: true, discount: true, status: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
        },
      },
    });
    const admins = adminUsers.map(u => ({
      ...u,
      dealerAssignments: assignments.filter(a => a.adminId === u.id),
    }));

    const repData = admins
      .filter(a => a.dealerAssignments.length > 0)
      .map(admin => {
        const dealers = admin.dealerAssignments.map(da => da.dealer);

        const allOrders = dealers.flatMap(d => d.orders);
        const totalOrders = allOrders.length;
        const totalRevenue = allOrders.reduce((s, o) => s + o.total - o.discount, 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "pending_approval").length;
        const shippedOrders = allOrders.filter(o => o.status === "shipped" || o.status === "delivered").length;

        return {
          repId: admin.id,
          repName: admin.name,
          repEmail: admin.email,
          dealerCount: dealers.length,
          dealers: dealers.map(d => ({
            id: d.id,
            name: d.name,
            company: d.company,
            orderCount: d.orders.length,
            revenue: d.orders.reduce((s, o) => s + o.total - o.discount, 0),
          })),
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          pendingOrders,
          shippedOrders,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      success: true,
      data: repData,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
