/** Admin panelde kayıtlı kimlik bilgileri .env üzerinde önceliklidir. */
function cleanCredential(value?: string | null) {
  return (value || "").trim().replace(/^["']+|["']+$/g, "");
}

export function resolveEsnekCredentials(row?: {
  esnekposMerchantId?: string | null;
  esnekposMerchantKey?: string | null;
}) {
  const dbId = cleanCredential(row?.esnekposMerchantId);
  const dbKey = cleanCredential(row?.esnekposMerchantKey);
  if (dbId && dbKey) {
    return { merchantId: dbId, merchantKey: dbKey };
  }
  return {
    merchantId: cleanCredential(process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN),
    merchantKey: cleanCredential(process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY),
  };
}

export function resolveIyzicoCredentials(row?: {
  iyzicoApiKey?: string | null;
  iyzicoSecretKey?: string | null;
}) {
  const dbKey = cleanCredential(row?.iyzicoApiKey);
  const dbSecret = cleanCredential(row?.iyzicoSecretKey);
  if (dbKey && dbSecret) {
    return { apiKey: dbKey, secretKey: dbSecret };
  }
  return {
    apiKey: cleanCredential(process.env.IYZICO_API_KEY),
    secretKey: cleanCredential(process.env.IYZICO_SECRET_KEY),
  };
}
