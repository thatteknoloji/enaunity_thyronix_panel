import { prisma } from "@/lib/db";
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentProviderKey,
} from "./payment-types";
import { createProviderByKey } from "./payment-provider-factory";
import { resolveActiveProviderKey } from "./payment-settings";
import { paymentDeadlineFromNow } from "./payment-method-policy";
import {
  grantProductLibraryAccessFromPayment,
  revokeProductLibraryAccessFromPayment,
} from "@/lib/product-library/package-access-service";

function getProvider(key?: PaymentProviderKey): PaymentProvider {
  const providerKey = key || "MANUAL";
  return createProviderByKey(providerKey);
}

export async function createPaymentIntent(params: CreatePaymentParams): Promise<PaymentResult> {
  const providerKey = params.providerKey || (await resolveActiveProviderKey());
  const provider = getProvider(providerKey);

  const existing = await prisma.modulePayment.findFirst({
    where: {
      dealerId: params.dealerId,
      moduleKey: params.moduleKey,
      ...(params.moduleKey === "B2B_ORDER" ? { planKey: params.planKey } : {}),
      status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] },
    },
  });

  let paymentId = existing?.id || params.metadata?.paymentId;
  const isManual = providerKey === "MANUAL" || params.paymentType === "MANUAL";
  if (!paymentId) {
    const payment = await prisma.modulePayment.create({
      data: {
        dealerId: params.dealerId,
        moduleKey: params.moduleKey,
        planKey: params.planKey,
        amount: params.amount,
        currency: params.currency,
        status: isManual ? "MANUAL_REVIEW" : "WAITING_PAYMENT",
        provider: providerKey,
        paymentType: params.paymentType,
        paymentDeadlineAt: isManual ? paymentDeadlineFromNow() : null,
      },
    });
    paymentId = payment.id;
  } else if (isManual) {
    await prisma.modulePayment.update({
      where: { id: paymentId },
      data: { paymentDeadlineAt: paymentDeadlineFromNow(), status: "MANUAL_REVIEW" },
    });
  }

  const result = await provider.createPayment({
    ...params,
    metadata: { ...params.metadata, paymentId },
  });

  if (result.success && paymentId) {
    await prisma.modulePayment.update({
      where: { id: paymentId },
      data: {
        status: result.status,
        provider: providerKey,
        providerReference: result.providerReference || paymentId,
      },
    });
    result.paymentId = paymentId;

    if (params.moduleKey !== "B2B_ORDER") {
      const license = await prisma.moduleLicense.findFirst({
        where: { dealerId: params.dealerId, moduleKey: params.moduleKey },
        orderBy: { createdAt: "desc" },
      });
      if (license) {
        await prisma.moduleLicense.update({
          where: { id: license.id },
          data: { status: "PENDING_PAYMENT", planKey: params.planKey },
        });
      } else {
        await prisma.moduleLicense.create({
          data: {
            dealerId: params.dealerId,
            moduleKey: params.moduleKey,
            planKey: params.planKey,
            status: "PENDING_PAYMENT",
          },
        });
      }
    }
  }

  return result;
}

export async function approvePayment(paymentId: string): Promise<PaymentResult> {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, status: "FAILED", message: "Ödeme bulunamadı" };

  await prisma.modulePayment.update({ where: { id: paymentId }, data: { status: "PAID", paidAt: new Date() } });

  if (payment.moduleKey === "B2B_ORDER") {
    const orderId = payment.planKey;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      return { success: false, status: "FAILED", message: "Sipariş bulunamadı" };
    }
    const nextStatus = order.dealerId ? "pending_approval" : "pending";
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    await prisma.payment.create({
      data: {
        dealerId: payment.dealerId,
        orderId,
        amount: payment.amount,
        type: "card",
        status: "COMPLETED",
        note: `${payment.provider} online sipariş ödemesi`,
      },
    });
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: nextStatus,
        note: "Online ödeme onaylandı",
        changedBy: "system",
      },
    });

    if (!order.dealerId) {
      await Promise.all(
        order.items.map(async (item) => {
          const product = item.product;
          if (!product || !item.productId) return;
          const deductQty = product.backorderable
            ? Math.min(item.quantity, product.stock)
            : item.quantity;
          if (deductQty > 0) {
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: "exit",
                quantity: deductQty,
                note: `Sipariş #${orderId.slice(0, 8)} (online ödeme)`,
                orderId,
              },
            });
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: deductQty } },
            });
          }
        })
      );
    }

    return { success: true, status: "PAID", message: "Sipariş ödemesi alındı, sipariş işleme alındı." };
  }

  if (payment.moduleKey === "PRODUCT_LIBRARY") {
    await grantProductLibraryAccessFromPayment(paymentId);
    return { success: true, status: "PAID", message: "Ödeme onaylandı, paket erişimi açıldı." };
  }

  const existingLicense = await prisma.moduleLicense.findFirst({
    where: { dealerId: payment.dealerId, moduleKey: payment.moduleKey },
    orderBy: { createdAt: "desc" },
  });
  const billingPeriod = payment.paymentType === "subscription" ? "monthly" : "monthly";
  const { computeLicenseEndsAt } = await import("@/lib/modules/subscription-utils");
  const endsAt = computeLicenseEndsAt(new Date(), billingPeriod);

  if (existingLicense) {
    const { resetLicenseLifecycleFlags } = await import("@/lib/modules/subscription-lifecycle-worker");
    await resetLicenseLifecycleFlags(existingLicense.id, endsAt, billingPeriod);
    await prisma.moduleLicense.update({
      where: { id: existingLicense.id },
      data: { planKey: payment.planKey },
    });
  } else {
    await prisma.moduleLicense.create({
      data: {
        dealerId: payment.dealerId,
        moduleKey: payment.moduleKey,
        planKey: payment.planKey,
        status: "ACTIVE",
        billingPeriod,
        startsAt: new Date(),
        endsAt,
        lifecycleStage: "active",
      },
    });
  }

  return { success: true, status: "PAID", message: "Ödeme onaylandı, lisans aktifleştirildi." };
}

export async function rejectPayment(paymentId: string): Promise<PaymentResult> {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, status: "FAILED", message: "Ödeme bulunamadı" };

  await prisma.modulePayment.update({ where: { id: paymentId }, data: { status: "FAILED" } });

  if (payment.moduleKey === "B2B_ORDER") {
    await prisma.order.updateMany({
      where: { id: payment.planKey, status: "waiting_payment" },
      data: { status: "cancelled" },
    });
    return { success: true, status: "FAILED", message: "Sipariş ödemesi reddedildi, sipariş iptal edildi." };
  }

  if (payment.moduleKey === "PRODUCT_LIBRARY") {
    await revokeProductLibraryAccessFromPayment(paymentId);
    return { success: true, status: "FAILED", message: "Ödeme reddedildi, paket erişimi açılmadı." };
  }

  await prisma.moduleLicense.updateMany({
    where: { dealerId: payment.dealerId, moduleKey: payment.moduleKey },
    data: { status: "INACTIVE" },
  });
  return { success: true, status: "FAILED", message: "Ödeme reddedildi." };
}

export { createProviderByKey, getProvider };
