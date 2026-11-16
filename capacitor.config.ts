import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlink.app',
  appName: 'Eth-Links',
  // Bundled into the APK: only the branded offline page (the app itself loads server.url).
  webDir: 'mobile-shell',
  server: {
    // Live production deployment (must match Vercel production alias)
    // Rebuild the Android APK after changing this URL.
    url: 'https://market-ai-v3-7pav-natnaeltekle236-5533s-projects.vercel.app',
    cleartext: false,
    // Shown instead of the Android WebView error page when the site can't load.
    // Keep APP_URL in mobile-shell/offline.html in sync with url above.
    errorPath: 'offline.html',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B0C15',
    // Keep false for release builds (no remote WebView debugging)
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Auto-hide so a JS hang cannot leave the user on a permanent black splash
      launchAutoHide: true,
      launchShowDuration: 2500,
      backgroundColor: '#0B0C15',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#f5c619',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
