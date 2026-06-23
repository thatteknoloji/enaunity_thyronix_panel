var ENA_CONNECTOR_CONFIG = {
  preferredOrigin: "https://enaunity.com.tr",
  origins: [
    "https://enaunity.com.tr",
    "http://localhost:3333",
    "http://127.0.0.1:3333"
  ],
  sessionPath: "/api/product-library/session",
  claimPath: "/api/product-library/marketplace-jobs/claim",
  popupPollMs: 15000,
  alarmName: "ena-marketplace-connector-poll",
  alarmMinutes: 1,
  supportedPlatforms: ["TRENDYOL", "HEPSIBURADA", "N11", "TEMU"]
};
