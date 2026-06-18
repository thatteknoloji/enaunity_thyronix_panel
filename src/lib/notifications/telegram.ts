const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

async function sendMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[Telegram] Bot token not configured, skipping:", text.substring(0, 80));
    return { ok: false, error: "Token not configured" };
  }

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  return res.json();
}

export const telegram = {
  async notifyNewOrder(params: {
    chatId: string;
    platform: string;
    orderId: string;
    customerName: string;
    totalAmount: number;
    items: { name: string; qty: number; price: number }[];
    missingBalance?: number;
  }) {
    const itemsText = params.items
      .map(i => `  • ${i.name} x${i.qty} — ₺${i.price.toFixed(2)}`)
      .join("\n");

    if (params.missingBalance && params.missingBalance > 0) {
      return sendMessage(
        params.chatId,
        `<b>🔔 Yeni Sipariş — Bakiye Yetersiz!</b>\n\n` +
        `<b>Platform:</b> ${params.platform.toUpperCase()}\n` +
        `<b>Sipariş No:</b> ${params.orderId}\n` +
        `<b>Müşteri:</b> ${params.customerName}\n` +
        `<b>Tutar:</b> ₺${params.totalAmount.toFixed(2)}\n\n` +
        `<b>Ürünler:</b>\n${itemsText}\n\n` +
        `<b>⚠️ Eksik Bakiye:</b> ₺${params.missingBalance.toFixed(2)}\n` +
        `<b>İşlem için ödeme yapmanız gerekiyor.</b>\n\n` +
        `<a href="http://localhost:3333/dealer/balance">Bakiye Yükle</a>`
      );
    }

    return sendMessage(
      params.chatId,
      `<b>✅ Sipariş İşlendi!</b>\n\n` +
      `<b>Platform:</b> ${params.platform.toUpperCase()}\n` +
      `<b>Sipariş No:</b> ${params.orderId}\n` +
      `<b>Müşteri:</b> ${params.customerName}\n` +
      `<b>Tutar:</b> ₺${params.totalAmount.toFixed(2)}\n\n` +
      `<b>Ürünler:</b>\n${itemsText}\n\n` +
      `<b>Bakiye yeterli, otomatik işlendi.</b>`
    );
  },

  async notifyBalanceAlert(params: {
    chatId: string;
    currentBalance: number;
  }) {
    return sendMessage(
      params.chatId,
      `<b>⚠️ Düşük Bakiye Uyarısı</b>\n\n` +
      `Mevcut bakiyeniz: <b>₺${params.currentBalance.toFixed(2)}</b>\n` +
      `Bekleyen siparişleriniz olabilir. Lütfen bakiye yükleyin.\n\n` +
      `<a href="http://localhost:3333/dealer/balance">Bakiye Yükle</a>`
    );
  },

  async testConnection(chatId: string) {
    return sendMessage(
      chatId,
      `<b>✅ Enaunity Bildirim Sistemi</b>\n\nTelegram bağlantınız başarıyla kuruldu.\nSipariş ve bakiye bildirimlerinizi buradan alacaksınız.`
    );
  },
};
