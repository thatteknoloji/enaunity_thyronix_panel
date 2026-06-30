import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDealerPrice } from "@/lib/dealer-pricing";
import { applyCampaigns } from "@/lib/campaign-engine";
import { createNotification, sendEmail } from "@/lib/notifications";
import { logAdminAction } from "@/lib/auth";

export type CartLifecycleStatus = "live" | "idle" | "abandoned_candidate" | "empty";
export type CartAudience = "dealer" | "customer";
export type CartActivityEventType =
  | "add"
  | "update_qty"
  | "remove"
  | "clear"
  | "checkout_started"
  | "checkout_completed"
  | "saved_cart_created";
export type CartReminderChannel = "panel" | "email";
export type ReminderTemplateKey =
  | "cart_reminder_basic"
  | "cart_reminder_support"
  | "cart_reminder_quote";

const LIVE_MINUTES = 15;
const ABANDONED_HOURS = 24;
const CHECKOUT_STARTED_DEDUPE_MINUTES = 20;
const REMINDER_COOLDOWN_HOURS = 24;

const cartBaseInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      role: true,
      dealerId: true,
      dealer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          group: true,
          discountRate: true,
          billingAddress: true,
          shippingAddress: true,
          taxNumber: true,
        },
      },
    },
  },
  items: {
    include: {
      product: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  },
} as const;

type LoadedCart = Prisma.CartGetPayload<{ include: typeof cartBaseInclude }>;

export type CartListFilters = {
  audience?: "all" | CartAudience;
  status?: "all" | Exclude<CartLifecycleStatus, "empty">;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  activityFrom?: string;
  activityTo?: string;
  productQuery?: string;
  page?: number;
  limit?: number;
};

export type CartSummary = {
  id: string;
  audience: CartAudience;
  status: CartLifecycleStatus;
  userId: string;
  dealerId: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  company: string;
  dealerName: string;
  dealerGroup: string;
  lastActivityAt: string;
  updatedAt: string;
  createdAt: string;
  itemCount: number;
  totalQuantity: number;
  cartTotal: number;
  lastReminderAt: string | null;
  reminderCount: number;
  lastReminderChannel: string | null;
  recentProducts: Array<{
    id: string;
    name: string;
    image: string;
    quantity: number;
    sku: string;
    barcode: string;
  }>;
  hasCheckoutStarted: boolean;
};

export type CartMetrics = {
  total: number;
  live: number;
  idle: number;
  abandoned: number;
  dealers: number;
  customers: number;
  totalValue: number;
};

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function hoursBetween(now: Date, then: Date) {
  return (now.getTime() - then.getTime()) / (60 * 60 * 1000);
}

function minutesBetween(now: Date, then: Date) {
  return (now.getTime() - then.getTime()) / (60 * 1000);
}

export function deriveCartStatus(lastActivityAt: Date | null | undefined, itemCount: number): CartLifecycleStatus {
  if (itemCount <= 0) return "empty";
  if (!lastActivityAt) return "idle";
  const now = new Date();
  const mins = minutesBetween(now, lastActivityAt);
  if (mins <= LIVE_MINUTES) return "live";
  const hours = mins / 60;
  if (hours >= ABANDONED_HOURS) return "abandoned_candidate";
  return "idle";
}

async function priceCartItems(cart: LoadedCart) {
  const dealer = cart.user.dealer;
  const dealerGroup = dealer?.group || "";
  const dealerDiscount = dealer?.discountRate || 0;
  const dealerId = dealer?.id || "";

  const items = await Promise.all(
    cart.items.map(async (item) => {
      const effectivePrice = dealer
        ? await getDealerPrice(
            item.productId,
            item.product.price,
            dealerGroup,
            dealerDiscount,
            item.quantity,
            dealerId,
          )
        : item.product.price;
      return {
        ...item,
        effectivePrice,
        lineTotal: effectivePrice * item.quantity,
      };
    }),
  );

  const cartTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const campaigns = await applyCampaigns(
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.effectivePrice,
    })),
    cartTotal,
    dealerGroup,
    dealerId,
    cart.user.id,
  );

  return {
    items,
    cartTotal,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.campaign.id,
      label: campaign.label,
      discount: campaign.discount,
      freeShipping: campaign.campaign.freeShipping,
    })),
  };
}

async function loadCartWithAux(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      ...cartBaseInclude,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      reminderLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!cart) return null;

  const [savedCarts, relatedOrders] = await Promise.all([
    cart.user.dealerId
      ? prisma.savedCart.findMany({
          where: { dealerId: cart.user.dealerId },
          include: { items: { include: { product: true } } },
          orderBy: { updatedAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.order.findMany({
      where: {
        OR: [
          { userId: cart.userId },
          ...(cart.user.dealerId ? [{ dealerId: cart.user.dealerId }] : []),
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { cart, savedCarts, relatedOrders };
}

async function buildSummary(cart: LoadedCart): Promise<CartSummary> {
  const { items, cartTotal } = await priceCartItems(cart);
  const latestReminder = await prisma.cartReminderLog.findFirst({
    where: { cartId: cart.id },
    orderBy: { createdAt: "desc" },
  });
  const reminderCount = await prisma.cartReminderLog.count({ where: { cartId: cart.id } });
  const latestCheckoutStart = await prisma.cartActivity.findFirst({
    where: { cartId: cart.id, eventType: "checkout_started" },
    orderBy: { createdAt: "desc" },
  });

  return {
    id: cart.id,
    audience: cart.user.dealerId ? "dealer" : "customer",
    status: deriveCartStatus(cart.lastActivityAt, items.length),
    userId: cart.user.id,
    dealerId: cart.user.dealerId || null,
    userName: cart.user.name,
    userEmail: cart.user.email,
    userPhone: cart.user.phone || cart.user.dealer?.phone || "",
    company: cart.user.company || cart.user.dealer?.company || "",
    dealerName: cart.user.dealer?.name || "",
    dealerGroup: cart.user.dealer?.group || "",
    lastActivityAt: cart.lastActivityAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    createdAt: cart.createdAt.toISOString(),
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    cartTotal,
    lastReminderAt: serializeDate(latestReminder?.createdAt) || null,
    reminderCount,
    lastReminderChannel: latestReminder?.channel || null,
    recentProducts: items.slice(0, 3).map((item) => ({
      id: item.product.id,
      name: item.product.name,
      image: item.product.image,
      quantity: item.quantity,
      sku: item.product.sku || "",
      barcode: item.product.barcode || "",
    })),
    hasCheckoutStarted: Boolean(latestCheckoutStart),
  };
}

async function computeSnapshot(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: cartBaseInclude,
  });

  if (!cart) {
    return {
      cartItemCount: 0,
      cartTotalSnapshot: 0,
    };
  }

  const priced = await priceCartItems(cart);
  return {
    cartItemCount: priced.items.length,
    cartTotalSnapshot: priced.cartTotal,
  };
}

export async function recordCartActivity(input: {
  cartId: string;
  userId: string;
  dealerId?: string | null;
  eventType: CartActivityEventType;
  productId?: string | null;
  variantId?: string | null;
  quantityBefore?: number;
  quantityAfter?: number;
  metadata?: Record<string, unknown>;
  snapshot?: { cartItemCount: number; cartTotalSnapshot: number };
  touchCart?: boolean;
}) {
  const now = new Date();
  const snapshot = input.snapshot || (await computeSnapshot(input.cartId));

  if (input.touchCart !== false) {
    await prisma.cart.update({
      where: { id: input.cartId },
      data: {
        lastActivityAt: now,
      },
    });
  }

  return prisma.cartActivity.create({
    data: {
      cartId: input.cartId,
      userId: input.userId,
      dealerId: input.dealerId || null,
      eventType: input.eventType,
      productId: input.productId || "",
      variantId: input.variantId || "",
      quantityBefore: input.quantityBefore || 0,
      quantityAfter: input.quantityAfter || 0,
      cartItemCount: snapshot.cartItemCount,
      cartTotalSnapshot: snapshot.cartTotalSnapshot,
      metadataJson: JSON.stringify(input.metadata || {}),
      createdAt: now,
    },
  });
}

export async function markCheckoutStartedForUser(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartBaseInclude,
  });

  if (!cart || cart.items.length === 0) return { skipped: true, reason: "empty_cart" };

  const recent = await prisma.cartActivity.findFirst({
    where: {
      cartId: cart.id,
      eventType: "checkout_started",
      createdAt: {
        gte: new Date(Date.now() - CHECKOUT_STARTED_DEDUPE_MINUTES * 60 * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { lastActivityAt: new Date() },
    });
    return { skipped: true, reason: "deduped" };
  }

  await recordCartActivity({
    cartId: cart.id,
    userId: cart.userId,
    dealerId: cart.user.dealerId || null,
    eventType: "checkout_started",
    metadata: {
      source: "checkout_page",
    },
  });

  return { skipped: false };
}

function matchesSearch(summary: CartSummary, search: string) {
  const haystack = [
    summary.userName,
    summary.userEmail,
    summary.userPhone,
    summary.company,
    summary.dealerName,
    summary.dealerGroup,
  ]
    .join(" ")
    .toLocaleLowerCase("tr");

  return haystack.includes(search.toLocaleLowerCase("tr"));
}

function matchesProductQuery(summary: CartSummary, productQuery: string) {
  const query = productQuery.toLocaleLowerCase("tr");
  return summary.recentProducts.some((product) =>
    [product.name, product.sku, product.barcode].join(" ").toLocaleLowerCase("tr").includes(query),
  );
}

export async function listObservedCarts(filters: CartListFilters) {
  const roughWhere: Prisma.CartWhereInput = {
    items: {
      some: {},
    },
  };

  if (filters.audience === "dealer") {
    roughWhere.user = { dealerId: { not: null } };
  } else if (filters.audience === "customer") {
    roughWhere.user = { dealerId: null };
  }

  if (filters.activityFrom || filters.activityTo) {
    roughWhere.lastActivityAt = {};
    if (filters.activityFrom) roughWhere.lastActivityAt.gte = new Date(filters.activityFrom);
    if (filters.activityTo) roughWhere.lastActivityAt.lte = new Date(filters.activityTo);
  }

  if (filters.search) {
    roughWhere.OR = [
      { user: { name: { contains: filters.search } } },
      { user: { email: { contains: filters.search } } },
      { user: { phone: { contains: filters.search } } },
      { user: { company: { contains: filters.search } } },
      { user: { dealer: { is: { company: { contains: filters.search } } } } },
      { user: { dealer: { is: { name: { contains: filters.search } } } } },
      { user: { dealer: { is: { email: { contains: filters.search } } } } },
    ];
  }

  if (filters.productQuery) {
    roughWhere.items = {
      some: {
        OR: [
          { product: { name: { contains: filters.productQuery } } },
          { product: { sku: { contains: filters.productQuery } } },
          { product: { barcode: { contains: filters.productQuery } } },
        ],
      },
    };
  }

  const carts = await prisma.cart.findMany({
    where: roughWhere,
    include: cartBaseInclude,
    orderBy: {
      lastActivityAt: "desc",
    },
  });

  const summaries = await Promise.all(carts.map((cart) => buildSummary(cart)));
  const filtered = summaries.filter((summary) => {
    if (summary.status === "empty") return false;
    if (filters.status && filters.status !== "all" && summary.status !== filters.status) return false;
    if (typeof filters.minTotal === "number" && summary.cartTotal < filters.minTotal) return false;
    if (typeof filters.maxTotal === "number" && summary.cartTotal > filters.maxTotal) return false;
    if (filters.search && !matchesSearch(summary, filters.search)) return false;
    if (filters.productQuery && !matchesProductQuery(summary, filters.productQuery)) return false;
    return true;
  });

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const total = filtered.length;
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getObservedCartMetrics(): Promise<CartMetrics> {
  const carts = await prisma.cart.findMany({
    where: {
      items: {
        some: {},
      },
    },
    include: cartBaseInclude,
  });

  const summaries = await Promise.all(carts.map((cart) => buildSummary(cart)));

  return summaries.reduce<CartMetrics>(
    (acc, summary) => {
      acc.total += 1;
      acc.totalValue += summary.cartTotal;
      if (summary.audience === "dealer") acc.dealers += 1;
      if (summary.audience === "customer") acc.customers += 1;
      if (summary.status === "live") acc.live += 1;
      if (summary.status === "idle") acc.idle += 1;
      if (summary.status === "abandoned_candidate") acc.abandoned += 1;
      return acc;
    },
    {
      total: 0,
      live: 0,
      idle: 0,
      abandoned: 0,
      dealers: 0,
      customers: 0,
      totalValue: 0,
    },
  );
}

function buildReminderTemplate(templateKey: ReminderTemplateKey, summary: CartSummary) {
  const baseLink = summary.audience === "dealer" ? "/dealer/orders" : "/cart";
  const name = summary.dealerName || summary.userName || "Merhaba";

  if (templateKey === "cart_reminder_support") {
    return {
      title: "Sepetiniz için destek vermeye hazırız",
      subject: "Sepetiniz için destek sunabiliriz",
      message: `${name}, sepetinizde ${summary.itemCount} ürün bekliyor. İsterseniz sizi arayalım ve siparişi birlikte tamamlayalım.`,
      link: baseLink,
    };
  }

  if (templateKey === "cart_reminder_quote") {
    return {
      title: "Sepetiniz için teklif/öneri hazırladık",
      subject: "Sepetiniz için teklif hazır",
      message: `${name}, bekleyen sepetiniz için özel öneri hazırladık. Ürünleri tekrar kontrol edip devam edebilirsiniz.`,
      link: baseLink,
    };
  }

  return {
    title: "Sepetiniz sizi bekliyor",
    subject: "Sepetiniz sizi bekliyor",
    message: `${name}, sepetinizde ${summary.itemCount} ürün ve ${summary.cartTotal.toFixed(2)} TL tutarında içerik sizi bekliyor.`,
    link: baseLink,
  };
}

async function hasReminderCooldown(cartId: string, templateKey: ReminderTemplateKey) {
  const existing = await prisma.cartReminderLog.findFirst({
    where: {
      cartId,
      templateKey,
      createdAt: {
        gte: new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000),
      },
      status: {
        in: ["queued", "sent"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Boolean(existing);
}

export async function sendCartReminder(params: {
  cartId: string;
  adminId: string;
  adminName: string;
  templateKey: ReminderTemplateKey;
  channels: CartReminderChannel[];
  meta?: Record<string, unknown>;
}) {
  const cart = await prisma.cart.findUnique({
    where: { id: params.cartId },
    include: cartBaseInclude,
  });

  if (!cart) {
    throw new Error("Sepet bulunamadı");
  }

  const summary = await buildSummary(cart);
  const template = buildReminderTemplate(params.templateKey, summary);
  const emailTarget = cart.user.dealer?.email || cart.user.email;
  const results: Array<{ channel: CartReminderChannel; status: string }> = [];

  for (const channel of params.channels) {
    try {
      if (channel === "panel") {
        if (summary.audience === "dealer" && summary.dealerId) {
          await createNotification({
            dealerId: summary.dealerId,
            title: template.title,
            message: template.message,
            type: "campaign",
            link: template.link,
          });
        } else {
          await createNotification({
            userId: summary.userId,
            title: template.title,
            message: template.message,
            type: "campaign",
            link: template.link,
          });
        }
      } else if (channel === "email" && emailTarget) {
        await sendEmail({
          to: emailTarget,
          subject: template.subject,
          html: `<p>Merhaba ${summary.dealerName || summary.userName},</p><p>${template.message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333"}${template.link}">Sepete dön</a></p>`,
        });
      } else if (channel === "email" && !emailTarget) {
        await prisma.cartReminderLog.create({
          data: {
            cartId: summary.id,
            userId: summary.userId,
            dealerId: summary.dealerId,
            channel,
            templateKey: params.templateKey,
            status: "skipped",
            sentByAdminId: params.adminId,
            sentByAdminName: params.adminName,
            payloadJson: JSON.stringify({
              ...params.meta,
              reason: "missing_email",
            }),
          },
        });
        results.push({ channel, status: "skipped" });
        continue;
      }

      await prisma.cartReminderLog.create({
        data: {
          cartId: summary.id,
          userId: summary.userId,
          dealerId: summary.dealerId,
          channel,
          templateKey: params.templateKey,
          status: "sent",
          sentByAdminId: params.adminId,
          sentByAdminName: params.adminName,
          payloadJson: JSON.stringify({
            ...params.meta,
            title: template.title,
            message: template.message,
            link: template.link,
          }),
        },
      });
      results.push({ channel, status: "sent" });
    } catch (error) {
      await prisma.cartReminderLog.create({
        data: {
          cartId: summary.id,
          userId: summary.userId,
          dealerId: summary.dealerId,
          channel,
          templateKey: params.templateKey,
          status: "failed",
          sentByAdminId: params.adminId,
          sentByAdminName: params.adminName,
          payloadJson: JSON.stringify({
            ...params.meta,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      });
      results.push({ channel, status: "failed" });
    }
  }

  return {
    summary,
    template,
    results,
  };
}

export async function buildCartSuggestions(cartId: string) {
  const detail = await getObservedCartDetail(cartId);
  const summary = detail.summary;
  const risk = summary.status === "abandoned_candidate" ? "high" : summary.status === "idle" ? "medium" : "low";

  return [
    {
      key: "quote",
      label: "Teklif öner",
      description: `${summary.cartTotal.toFixed(2)} TL sepet için özel teklif veya fiyat teyidi öner.`,
      risk,
    },
    {
      key: "support_call",
      label: "Geri arama öner",
      description: `${summary.userName} için destek araması veya WhatsApp dönüşü başlat.`,
      risk,
    },
    {
      key: "saved_cart",
      label: "Kaydedilmiş sepeti tamamlat",
      description: `${detail.savedCarts.length} kayıtlı sepetten uygun olanı öne çıkar.`,
      risk,
    },
  ];
}

export async function createCartSuggestionAction(params: {
  cartId: string;
  adminId: string;
  adminName: string;
  action: "quote" | "support_call" | "saved_cart" | "sales_task";
}) {
  const detail = await getObservedCartDetail(params.cartId);
  const payload = {
    action: params.action,
    cartTotal: detail.summary.cartTotal,
    userName: detail.summary.userName,
    dealerName: detail.summary.dealerName,
    company: detail.summary.company,
  };

  await logAdminAction(
    params.adminId,
    params.adminName,
    "cart_suggestion_action",
    params.cartId,
    JSON.stringify(payload),
  );

  return payload;
}

export async function getObservedCartDetail(cartId: string) {
  const loaded = await loadCartWithAux(cartId);
  if (!loaded) {
    throw new Error("Sepet bulunamadı");
  }

  const summary = await buildSummary(loaded.cart);
  const priced = await priceCartItems(loaded.cart);
  const convertedOrderIds = loaded.cart.activities
    .filter((activity) => activity.eventType === "checkout_completed")
    .map((activity) => safeJsonParse<{ orderId?: string }>(activity.metadataJson, {}).orderId)
    .filter(Boolean) as string[];

  return {
    summary,
    account: {
      audience: summary.audience,
      company: summary.company,
      dealerName: summary.dealerName,
      dealerGroup: summary.dealerGroup,
      contactName: summary.userName,
      email: summary.userEmail,
      phone: summary.userPhone,
      billingAddress: loaded.cart.user.dealer?.billingAddress || "",
      shippingAddress: loaded.cart.user.dealer?.shippingAddress || "",
      taxNumber: loaded.cart.user.dealer?.taxNumber || "",
    },
    items: priced.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      effectivePrice: item.effectivePrice,
      lineTotal: item.lineTotal,
      product: {
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
        sku: item.product.sku,
        barcode: item.product.barcode,
        modelCode: item.product.modelCode,
        category: item.product.category,
        stock: item.product.stock,
      },
    })),
    campaigns: priced.campaigns,
    activities: loaded.cart.activities.map((activity) => ({
      id: activity.id,
      eventType: activity.eventType,
      productId: activity.productId,
      variantId: activity.variantId,
      quantityBefore: activity.quantityBefore,
      quantityAfter: activity.quantityAfter,
      cartItemCount: activity.cartItemCount,
      cartTotalSnapshot: activity.cartTotalSnapshot,
      metadata: safeJsonParse<Record<string, unknown>>(activity.metadataJson, {}),
      createdAt: activity.createdAt.toISOString(),
    })),
    reminderLogs: loaded.cart.reminderLogs.map((log) => ({
      id: log.id,
      channel: log.channel,
      templateKey: log.templateKey,
      status: log.status,
      sentByAdminId: log.sentByAdminId,
      sentByAdminName: log.sentByAdminName,
      payload: safeJsonParse<Record<string, unknown>>(log.payloadJson, {}),
      createdAt: log.createdAt.toISOString(),
    })),
    savedCarts: loaded.savedCarts.map((savedCart) => ({
      id: savedCart.id,
      name: savedCart.name,
      total: savedCart.total,
      updatedAt: savedCart.updatedAt.toISOString(),
      itemCount: savedCart.items.length,
    })),
    relatedOrders: loaded.relatedOrders.map((order) => ({
      id: order.id,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      isConvertedFromThisCart: convertedOrderIds.includes(order.id),
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        productName: item.product?.name || "Ürün",
        image: item.product?.image || "/placeholder.svg",
      })),
    })),
  };
}

function chooseAutomaticTemplate(summary: CartSummary, lastCheckoutStartedAt: Date | null) {
  if (lastCheckoutStartedAt) return "cart_reminder_support" as const;
  if (summary.status === "abandoned_candidate") return "cart_reminder_quote" as const;
  return "cart_reminder_basic" as const;
}

export async function runCartRecoveryWorker() {
  const candidateCarts = await prisma.cart.findMany({
    where: {
      items: {
        some: {},
      },
      lastActivityAt: {
        lte: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    },
    include: cartBaseInclude,
    orderBy: {
      lastActivityAt: "asc",
    },
  });

  let checked = 0;
  let sent = 0;
  let skipped = 0;

  for (const cart of candidateCarts) {
    checked += 1;
    const summary = await buildSummary(cart);
    if (summary.status === "empty") {
      skipped += 1;
      continue;
    }

    const idleHours = hoursBetween(new Date(), cart.lastActivityAt);
    const threshold = summary.audience === "dealer" ? 4 : 2;
    if (idleHours < threshold) {
      skipped += 1;
      continue;
    }

    const lastCheckoutStarted = await prisma.cartActivity.findFirst({
      where: {
        cartId: cart.id,
        eventType: "checkout_started",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const lastCheckoutCompleted = await prisma.cartActivity.findFirst({
      where: {
        cartId: cart.id,
        eventType: "checkout_completed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const prioritizeCheckout =
      lastCheckoutStarted &&
      (!lastCheckoutCompleted || lastCheckoutStarted.createdAt > lastCheckoutCompleted.createdAt)
        ? lastCheckoutStarted.createdAt
        : null;
    const templateKey = chooseAutomaticTemplate(summary, prioritizeCheckout);

    if (await hasReminderCooldown(cart.id, templateKey)) {
      skipped += 1;
      continue;
    }

    await sendCartReminder({
      cartId: cart.id,
      adminId: "system",
      adminName: "system",
      templateKey,
      channels: ["panel", "email"],
      meta: {
        mode: "automatic",
      },
    });
    sent += 1;
  }

  return {
    checked,
    sent,
    skipped,
  };
}
