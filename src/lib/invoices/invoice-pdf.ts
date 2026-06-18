import type { InvoiceSourceType } from "./config";

export type InvoicePdfData = {
  number: string;
  sourceType: InvoiceSourceType;
  paymentStatus: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  dealer: { company?: string; name?: string; email?: string } | null;
  items: Array<{ productName: string; description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes: string;
  orderNumber?: string;
};

export function buildInvoicePdfData(invoice: {
  number: string;
  sourceType: string;
  paymentStatus: string;
  status: string;
  createdAt: Date | string;
  dueDate: Date | string | null;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes: string;
  dealer?: { company?: string | null; name?: string | null; email?: string | null } | null;
  items: Array<{ productName: string; description: string; quantity: number; unitPrice: number; total: number }>;
  order?: { orderNumber?: string | null } | null;
}): InvoicePdfData {
  return {
    number: invoice.number,
    sourceType: invoice.sourceType as InvoicePdfData["sourceType"],
    paymentStatus: invoice.paymentStatus,
    status: invoice.status,
    createdAt: typeof invoice.createdAt === "string" ? invoice.createdAt : invoice.createdAt.toISOString(),
    dueDate: invoice.dueDate
      ? typeof invoice.dueDate === "string"
        ? invoice.dueDate
        : invoice.dueDate.toISOString()
      : null,
    dealer: invoice.dealer
      ? { company: invoice.dealer.company || undefined, name: invoice.dealer.name || undefined, email: invoice.dealer.email || undefined }
      : null,
    items: invoice.items,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    paidAmount: invoice.paidAmount,
    notes: invoice.notes,
    orderNumber: invoice.order?.orderNumber || undefined,
  };
}

export async function renderInvoicePdf(doc: import("jspdf").jsPDF, data: InvoicePdfData, margin = 20) {
  let y = 20;
  doc.setFontSize(16);
  doc.setTextColor(229, 9, 20);
  doc.text("ENAUNITY", margin, y);
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text("B4B Toptan Platformu", margin, (y += 5));
  doc.text(`Fatura No: ${data.number}`, margin, (y += 5));
  doc.text(`Tarih: ${new Date(data.createdAt).toLocaleDateString("tr-TR")}`, margin, (y += 5));
  if (data.dueDate) {
    doc.text(`Vade: ${new Date(data.dueDate).toLocaleDateString("tr-TR")}`, margin, (y += 5));
  }
  doc.text(`Kaynak: ${data.sourceType}`, margin, (y += 5));
  if (data.orderNumber) {
    doc.text(`Sipariş: ${data.orderNumber}`, margin, (y += 5));
  }
  y += 8;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FATURA", margin, y);
  y += 8;

  if (data.dealer) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Bayi: ${data.dealer.company || data.dealer.name || "-"}`, margin, y);
    y += 7;
    if (data.dealer.email) {
      doc.text(`E-posta: ${data.dealer.email}`, margin, y);
      y += 7;
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, 170, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Ürün", margin + 2, y + 5.5);
  doc.text("Adet", margin + 90, y + 5.5);
  doc.text("Birim", margin + 115, y + 5.5);
  doc.text("Tutar", margin + 150, y + 5.5);
  y += 10;

  for (const item of data.items) {
    doc.text(item.productName.slice(0, 40), margin + 2, y + 5.5);
    doc.text(String(item.quantity), margin + 90, y + 5.5);
    doc.text(`${item.unitPrice.toFixed(2)} ₺`, margin + 115, y + 5.5);
    doc.text(`${item.total.toFixed(2)} ₺`, margin + 150, y + 5.5);
    y += 7;
  }

  y += 3;
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Ara Toplam: ${data.subtotal.toFixed(2)} ₺`, margin + 110, y);
  y += 6;
  if (data.discount > 0) {
    doc.text(`İndirim: -${data.discount.toFixed(2)} ₺`, margin + 110, y);
    y += 6;
  }
  doc.text(`KDV (%${data.taxRate}): ${data.taxAmount.toFixed(2)} ₺`, margin + 110, y);
  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Genel Toplam: ${data.total.toFixed(2)} ₺`, margin + 110, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Ödeme Durumu: ${data.paymentStatus}`, margin + 110, y);
  if (data.paidAmount > 0) {
    y += 6;
    doc.text(`Ödenen: ${data.paidAmount.toFixed(2)} ₺`, margin + 110, y);
  }
  y += 15;
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text("Bu belge Invoice modeli üzerinden oluşturulmuştur. ENAUNITY B4B Platform", margin, y);
}

export async function downloadInvoicePdf(data: InvoicePdfData, filename?: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await renderInvoicePdf(doc, data);
  doc.save(filename || `${data.number}.pdf`);
}
