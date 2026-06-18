import { prisma } from "./db";
import nodemailer from "nodemailer";
import { sendSMS } from "./sms";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "" },
});

export async function createNotification({
  dealerId, userId, title, message, type = "info", link = "",
}: {
  dealerId?: string; userId?: string; title: string; message: string; type?: string; link?: string;
}) {
  return prisma.notification.create({
    data: { dealerId: dealerId || null, userId: userId || null, title, message, type, link },
  });
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"ENAUNITY" <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
  } catch { /* email fail gracefully */ }
}

export async function notifyOrderCreated(dealerId: string, orderId: string, total: number, dealerEmail: string, dealerName: string, items: { name: string; qty: number; price: number }[], dealerPhone?: string) {
  await createNotification({
    dealerId, title: "Sipariş Alındı",
    message: `#${orderId.slice(0, 8)} nolu siparişiniz alındı. Toplam: ${total.toFixed(2)} ₺`,
    type: "order", link: `/dealer/orders/${orderId}`,
  });
  const { orderCreatedEmail } = await import("./email-templates");
  sendEmail({ to: dealerEmail, subject: `Sipariş #${orderId.slice(0, 8)} Alındı`, html: orderCreatedEmail(dealerName, orderId.slice(0, 8), total, items) }).catch(() => {});
  await sendSMS(`Sipariş #${orderId.slice(0, 8)} alındı. Toplam: ${total.toFixed(2)} ₺`, dealerPhone).catch(() => {});
}

export async function notifyOrderStatus(dealerId: string, orderId: string, status: string, statusLabel: string, dealerEmail: string, dealerName: string, dealerPhone?: string) {
  await createNotification({
    dealerId, title: "Sipariş Durumu",
    message: `#${orderId.slice(0, 8)} nolu sipariş "${statusLabel}" olarak güncellendi.`,
    type: "order", link: `/dealer/orders/${orderId}`,
  });
  const { orderStatusEmail } = await import("./email-templates");
  sendEmail({ to: dealerEmail, subject: `Sipariş #${orderId.slice(0, 8)} — ${statusLabel}`, html: orderStatusEmail(dealerName, orderId.slice(0, 8), status, statusLabel) }).catch(() => {});
  if (status === "shipped" || status === "delivered") {
    await sendSMS(`Sipariş #${orderId.slice(0, 8)} — ${statusLabel}`, dealerPhone).catch(() => {});
  }
}

export async function notifyTracking(dealerId: string, orderId: string, carrier: string, trackingNumber: string, dealerEmail: string, dealerName: string, dealerPhone?: string) {
  await createNotification({
    dealerId, title: "Kargoya Verildi",
    message: `#${orderId.slice(0, 8)} nolu sipariş ${carrier} ile kargoya verildi. Takip: ${trackingNumber}`,
    type: "order", link: `/dealer/orders/${orderId}`,
  });
  const { trackingEmail } = await import("./email-templates");
  sendEmail({ to: dealerEmail, subject: `Kargo Takip — #${orderId.slice(0, 8)}`, html: trackingEmail(dealerName, orderId.slice(0, 8), carrier, trackingNumber) }).catch(() => {});
  await sendSMS(`Kargo: ${carrier} — Takip No: ${trackingNumber}`, dealerPhone).catch(() => {});
}

export async function notifyReturnStatus(dealerId: string, returnId: string, status: string, note: string, dealerEmail: string, dealerName: string, dealerPhone?: string) {
  const label = status === "approved" ? "Onaylandı" : "Reddedildi";
  await createNotification({
    dealerId, title: `İade ${label}`,
    message: `İade talebiniz ${label.toLowerCase()}.${note ? ` Not: ${note}` : ""}`,
    type: "return", link: `/dealer/returns`,
  });
  const { returnStatusEmail } = await import("./email-templates");
  sendEmail({ to: dealerEmail, subject: `İade Talebi — ${label}`, html: returnStatusEmail(dealerName, returnId.slice(0, 8), status, note) }).catch(() => {});
  await sendSMS(`İade talebiniz ${label.toLowerCase()} — #${returnId.slice(0, 8)}`, dealerPhone).catch(() => {});
}
