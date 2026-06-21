import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.LINKSLASH_SERVER_URL || "https://enaunity.com.tr/linkslash/mobile/";

const config: CapacitorConfig = {
  appId: "com.enaunity.linkslash",
  appName: "LinkSlash",
  webDir: "../../public/linkslash/mobile",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    ShareReceiver: {},
  },
};

export default config;
