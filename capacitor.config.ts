import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ye.shehara.app",
  appName: "Shehara",
  webDir: ".output/public",

  loggingBehavior: "none",

  backgroundColor: "#0E4D64",

  server: {
    androidScheme: "https",
  },
};

export default config;
