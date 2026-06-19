import { prisma } from "@/lib/db";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { listOrders } from "./orders";

type Period = "daily" | "weekly" | "monthly";

type ReportOrder = {
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  status: string;
  fulfillmentStatus?: string;
  createdAt: Date;
  shipments?: Array<{ shippingCost?: number }>;
};

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

function aggregateOrders(orders: ReportOrder[]) {
  const orderCount = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const cost = orders.reduce((s, o) => s + o.totalCost, 0);
  const profit = orders.reduce((s, o) => s + o.totalProfit, 0);
  const shipping = orders.reduce((s, o) => {
    const ship = (o.shipments || []).reduce((ss, sh) => ss + (sh.shippingCost || 0), 0);
    return s + ship;
  }, 0);
  const returns = orders.filter((o) => (o.fulfillmentStatus || o.status) === "RETURNED").length;
  return { orderCount, revenue, cost, profit, shipping, returns };
}

async function ordersInPeriod(period: Period, dealerId?: string): Promise<ReportOrder[]> {
  const { start, end } = periodRange(period);
  const all = await listOrders({ dealerId, limit: 5000, includeLegacy: isCoreOrderEngine() });
  return all
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    })
    .map((o) => ({
      totalAmount: o.totalAmount,
      totalCost: o.totalCost,
      totalProfit: o.totalProfit,
      status: o.status,
      fulfillmentStatus: o.fulfillmentStatus,
      createdAt: o.createdAt,
      shipments: (o.shipments || []) as Array<{ shippingCost?: number }>,
    }));
}

export async function getFulfillmentReport(period: Period = "monthly", dealerId?: string) {
  const { start, end } = periodRange(period);
  const orders = await ordersInPeriod(period, dealerId);
  return { period, ...aggregateOrders(orders), start, end };
}

export async function getAdminDashboardStats() {
  const [shipmentCount, accountCount, todayOrders, recentUnified] = await Promise.all([
    prisma.dealerShipment.count(),
    prisma.dealerAccount.count(),
    ordersInPeriod("daily"),
    listOrders({ limit: 8 }),
  ]);

  const todayReport = aggregateOrders(todayOrders);

  return {
    orderCount: (await listOrders({ limit: 5000 })).length,
    shipmentCount,
    accountCount,
    todayReport: { period: "daily" as const, ...todayReport, start: periodRange("daily").start, end: periodRange("daily").end },
    recentOrders: recentUnified.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.fulfillmentStatus || o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      dealer: o.dealer,
    })),
  };
}
