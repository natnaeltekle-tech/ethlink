import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlinks.app',        // change if your appId is different
  appName: 'Eth-Links',
  webDir: 'out',                     // or 'dist' depending on your Next.js output
  server: {
    url: 'https://ethlink-app.vercel.app',
    cleartext: false, // Security: enforce HTTPS
  },
  android: {
    allowMixedContent: false, // Security: block mixed content
    backgroundColor: '#0B0C15',
    webContentsDebuggingEnabled: false, // Security: disable devtools in production
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 2000,
      backgroundColor: '#0B0C15',
      androidScaleType: 'CENTER',
    },
  },
};

export default config;