import { prisma } from "@/lib/db";

type Period = "daily" | "weekly" | "monthly";

function periodRange(period: Period) {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  if (period === "daily") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "weekly") {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start, end };
}

export async function getFulfillmentReport(period: Period = "monthly", dealerId?: string) {
  const { start, end } = periodRange(period);
  const where = {
    ...(dealerId ? { dealerId } : {}),
    createdAt: { gte: start, lte: end },
  };

  const orders = await prisma.dealerOrder.findMany({ where, include: { shipments: true } });

  const orderCount = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const cost = orders.reduce((s, o) => s + o.totalCost, 0);
  const profit = orders.reduce((s, o) => s + o.totalProfit, 0);
  const shipping = orders.reduce((s, o) => {
    const ship = o.shipments.reduce((ss, sh) => ss + sh.shippingCost, 0);
    return s + ship;
  }, 0);
  const returns = orders.filter((o) => o.status === "RETURNED").length;

  return { period, orderCount, revenue, cost, profit, shipping, returns, start, end };
}

export async function getAdminDashboardStats() {
  const [orderCount, shipmentCount, accountCount, todayReport] = await Promise.all([
    prisma.dealerOrder.count(),
    prisma.dealerShipment.count(),
    prisma.dealerAccount.count(),
    getFulfillmentReport("daily"),
  ]);
  const recentOrders = await prisma.dealerOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { dealer: { select: { name: true } } },
  });
  return { orderCount, shipmentCount, accountCount, todayReport, recentOrders };
}
