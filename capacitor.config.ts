import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlink.app',
  appName: 'Eth-Links',
  webDir: 'public', // This doesn't matter if we use server url
  server: {
    url: 'https://ethlink-app.vercel.app', // Your Live URL
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // Show splash for ~2 seconds minimum
      launchAutoHide: false,
      backgroundColor: '#0B0C15', // Match app's dark background
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  },
  android: {
    backgroundColor: '#0B0C15',
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  }
};

export default config;