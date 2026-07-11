export function isHiveEnabled(): boolean {
  return process.env.HIVE_ENABLED !== "false";
}

export function isHiveSalesActive(): boolean {
  if (!isHiveEnabled()) return false;
  return process.env.HIVE_SALES_ACTIVE !== "false";
}

export function getHiveConfig() {
  return {
    enabled: isHiveEnabled(),
    salesActive: isHiveSalesActive(),
    baseUrl: process.env.HIVE_BASE_URL || "https://hive.thiqos.com",
    proxyMode: (process.env.HIVE_PROXY_MODE || "internal") as "internal" | "external",
    timeoutMs: Number(process.env.HIVE_TIMEOUT || "8000"),
  };
}
