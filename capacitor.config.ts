import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlink.app',
  appName: 'Eth-Links',
  // Bundled into the APK: only the branded offline page (the app itself loads server.url).
  webDir: 'mobile-shell',
  server: {
    // Public production domain. Must be a domain added under Vercel → Domains:
    // the automatic *-projects.vercel.app aliases sit behind Vercel Authentication
    // (Deployment Protection) and show Vercel's login/error page inside the app.
    // Rebuild the Android APK after changing this URL.
    url: 'https://ethlink-app.vercel.app',
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
    PushNotifications: {
      // Also show notifications while the app is open (Android)
      presentationOptions: ['sound', 'alert'],
    },
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
