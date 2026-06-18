import { prisma } from "@/lib/db";
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentProviderKey,
  getActivePaymentProvider,
} from "./payment-types";
import { createProviderByKey } from "./payment-provider-factory";
import {
  grantProductLibraryAccessFromPayment,
  revokeProductLibraryAccessFromPayment,
} from "@/lib/product-library/package-access-service";

function getProvider(key?: PaymentProviderKey): PaymentProvider {
  const providerKey = key || getActivePaymentProvider();
  return createProviderByKey(providerKey);
}

export async function createPaymentIntent(params: CreatePaymentParams): Promise<PaymentResult> {
  const providerKey = params.providerKey || getActivePaymentProvider();
  const provider = getProvider(providerKey);

  const existing = await prisma.modulePayment.findFirst({
    where: {
      dealerId: params.dealerId,
      moduleKey: params.moduleKey,
      status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] },
    },
  });

  let paymentId = existing?.id || params.metadata?.paymentId;
  if (!paymentId) {
    const payment = await prisma.modulePayment.create({
      data: {
        dealerId: params.dealerId,
        moduleKey: params.moduleKey,
        planKey: params.planKey,
        amount: params.amount,
        currency: params.currency,
        status: "WAITING_PAYMENT",
        provider: providerKey,
        paymentType: params.paymentType,
      },
    });
    paymentId = payment.id;
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

  return result;
}

export async function approvePayment(paymentId: string): Promise<PaymentResult> {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, status: "FAILED", message: "Ödeme bulunamadı" };

  await prisma.modulePayment.update({ where: { id: paymentId }, data: { status: "PAID", paidAt: new Date() } });

  if (payment.moduleKey === "PRODUCT_LIBRARY") {
    await grantProductLibraryAccessFromPayment(paymentId);
    return { success: true, status: "PAID", message: "Ödeme onaylandı, paket erişimi açıldı." };
  }

  const existingLicense = await prisma.moduleLicense.findFirst({
    where: { dealerId: payment.dealerId, moduleKey: payment.moduleKey },
    orderBy: { createdAt: "desc" },
  });
  const endsAt = new Date();
  endsAt.setMonth(endsAt.getMonth() + 1);

  if (existingLicense) {
    await prisma.moduleLicense.update({
      where: { id: existingLicense.id },
      data: { status: "ACTIVE", startsAt: new Date(), endsAt, planKey: payment.planKey },
    });
  } else {
    await prisma.moduleLicense.create({
      data: {
        dealerId: payment.dealerId,
        moduleKey: payment.moduleKey,
        planKey: payment.planKey,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt,
      },
    });
  }

  return { success: true, status: "PAID", message: "Ödeme onaylandı, lisans aktifleştirildi." };
}

export async function rejectPayment(paymentId: string): Promise<PaymentResult> {
  const payment = await prisma.modulePayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, status: "FAILED", message: "Ödeme bulunamadı" };

  await prisma.modulePayment.update({ where: { id: paymentId }, data: { status: "FAILED" } });

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
