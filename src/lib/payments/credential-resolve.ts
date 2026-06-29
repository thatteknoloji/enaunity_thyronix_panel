/** Admin panelde kayıtlı kimlik bilgileri .env üzerinde önceliklidir. */
export function resolveEsnekCredentials(row?: {
  esnekposMerchantId?: string | null;
  esnekposMerchantKey?: string | null;
}) {
  const dbId = row?.esnekposMerchantId?.trim() || "";
  const dbKey = row?.esnekposMerchantKey?.trim() || "";
  if (dbId && dbKey) {
    return { merchantId: dbId, merchantKey: dbKey };
  }
  return {
    merchantId: process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN || "",
    merchantKey: process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY || "",
  };
}

export function resolveIyzicoCredentials(row?: {
  iyzicoApiKey?: string | null;
  iyzicoSecretKey?: string | null;
}) {
  const dbKey = row?.iyzicoApiKey?.trim() || "";
  const dbSecret = row?.iyzicoSecretKey?.trim() || "";
  if (dbKey && dbSecret) {
    return { apiKey: dbKey, secretKey: dbSecret };
  }
  return {
    apiKey: process.env.IYZICO_API_KEY || "",
    secretKey: process.env.IYZICO_SECRET_KEY || "",
  };
}
