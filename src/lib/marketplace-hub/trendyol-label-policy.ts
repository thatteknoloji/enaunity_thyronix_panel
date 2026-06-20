export function formatTrendyolLabelError(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes("yetkiniz bulunmamaktadır") || text.includes("yetkiniz bulunmamaktadir")) {
    return "Trendyol ortak etiket servisi bu satıcı hesabında aktif değil. TY kategori yöneticinizden açtırın veya etiketi Trendyol panelinden indirip PDF yükleyin.";
  }
  if (text.includes("yurtiçi") || text.includes("yurtici") || text.includes("mng") || text.includes("ptt")) {
    return "Bu kargo firması için ortak etiket API kullanılamaz. Etiketi Trendyol panelinden indirip PDF yükleyin.";
  }
  if (text.includes("common_label_not_found")) {
    return "Ortak etiket henüz oluşmadı. Önce TY'den yenile yapın; sadece Trendyol Express / Aras gönderilerinde geçerlidir.";
  }
  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
}

export function supportsTrendyolCommonLabel(cargoProviderName?: string): boolean {
  const name = (cargoProviderName || "").toLowerCase();
  if (!name) return true;
  if (name.includes("yurtiçi") || name.includes("yurtici")) return false;
  if (name.includes("mng") || name.includes("ptt") || name.includes("sürat") || name.includes("surat")) {
    return false;
  }
  return true;
}

export function isTrendyolLabelPermissionError(msg: string): boolean {
  const t = msg.toLowerCase();
  return t.includes("yetkiniz bulunmamaktadır") || t.includes("yetkiniz bulunmamaktadir");
}
