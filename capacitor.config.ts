import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Change this to your own reverse-domain app id before publishing.
  appId: "eg.nearbyhealth.clinics",
  appName: "دليل العيادات",
  // Static SPA build output — see scripts/copy-capacitor-www.mjs
  webDir: "www-android",
  server: {
    // Serves the bundled app over https://localhost inside the WebView.
    // This (not http) is required for navigator.share / navigator.clipboard
    // to work, since both need a secure context.
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      // Do NOT automatically request permission on first launch.
      // Permission is requested by usePushNotifications.ts at the appropriate moment.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
