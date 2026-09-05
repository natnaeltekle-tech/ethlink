import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlinks.app',
  appName: 'Eth-Links',
  webDir: 'out',
  server: {
    // Live site loaded inside the Android WebView
    url: 'https://ethlink-app.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B0C15',
    // Temporarily true so device debugging can catch JS errors if black screen returns
    webContentsDebuggingEnabled: true,
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
