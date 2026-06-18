const BRAND = "ENAUNITY";
const LOGO_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3333";
const PRIMARY = "#e50914";

function base(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
<tr><td style="background:${PRIMARY};padding:24px 32px;text-align:center">
<span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:1px">${BRAND}<sup style="font-size:10px;vertical-align:super">®</sup></span>
</td></tr>
<tr><td style="padding:32px">${content}</td></tr>
<tr><td style="background:#fafafa;padding:16px 32px;text-align:center;border-top:1px solid #eee">
<p style="font-size:11px;color:#999;margin:0">© ${new Date().getFullYear()} ENAUNITY. Tüm hakları saklıdır.</p>
<p style="font-size:11px;color:#ccc;margin:4px 0 0">Bu e-posta otomatik olarak gönderilmiştir.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

export function orderCreatedEmail(name: string, orderId: string, total: number, items: { name: string; qty: number; price: number }[]) {
  const itemsHtml = items.map((i) =>
    `<tr><td style="padding:6px 0;font-size:14px;border-bottom:1px solid #f0f0f0">${i.name} <span style="color:#999">x${i.qty}</span></td><td style="text-align:right;font-weight:600">${(i.price * i.qty).toFixed(2)} ₺</td></tr>`
  ).join("");
  return base(`
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px">Merhaba ${name},</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 20px">Siparişiniz başarıyla alındı.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="font-size:13px;color:#666;margin:0 0 4px">Sipariş No</p>
      <p style="font-size:16px;font-weight:700;margin:0;font-family:monospace">#${orderId}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${itemsHtml}</table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:16px;font-weight:700;padding-top:8px;border-top:2px solid #e5e5e5">Toplam</td><td style="font-size:16px;font-weight:700;text-align:right;padding-top:8px;border-top:2px solid #e5e5e5;color:${PRIMARY}">${total.toFixed(2)} ₺</td></tr>
    </table>
  `);
}

export function orderStatusEmail(name: string, orderId: string, status: string, statusLabel: string) {
  return base(`
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px">Merhaba ${name},</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 20px">Sipariş durumunuz güncellendi.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px">
      <p style="font-size:13px;color:#666;margin:0 0 8px">Sipariş #${orderId}</p>
      <span style="display:inline-block;background:${status === "delivered" ? "#10b981" : status === "cancelled" ? "#ef4444" : status === "shipped" ? "#3b82f6" : "#f59e0b"};color:#fff;padding:6px 20px;border-radius:20px;font-size:14px;font-weight:600">${statusLabel}</span>
    </div>
  `);
}

export function trackingEmail(name: string, orderId: string, carrier: string, trackingNumber: string) {
  return base(`
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px">Merhaba ${name},</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 20px">Siparişiniz kargoya verildi.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
      <table width="100%">
        <tr><td style="font-size:13px;color:#666;padding:4px 0">Kargo</td><td style="font-weight:600">${carrier}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding:4px 0">Takip No</td><td style="font-weight:700;font-family:monospace;font-size:16px">${trackingNumber}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding:4px 0">Sipariş</td><td style="font-family:monospace">#${orderId}</td></tr>
      </table>
    </div>
  `);
}

export function returnStatusEmail(name: string, returnId: string, status: string, note: string) {
  const statusLabel = status === "approved" ? "Onaylandı" : "Reddedildi";
  const color = status === "approved" ? "#10b981" : "#ef4444";
  return base(`
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px">Merhaba ${name},</h2>
    <div style="background:#f9fafb;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px">
      <p style="font-size:13px;color:#666;margin:0 0 8px">İade Talebi #${returnId}</p>
      <span style="display:inline-block;background:${color};color:#fff;padding:6px 20px;border-radius:20px;font-size:14px;font-weight:600">${statusLabel}</span>
      ${note ? `<p style="font-size:13px;color:#666;margin:12px 0 0">${note}</p>` : ""}
    </div>
  `);
}
