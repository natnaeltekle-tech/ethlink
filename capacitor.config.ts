import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlinks.app',        // change if your appId is different
  appName: 'Eth-Links',
  webDir: 'out',                     // or 'dist' depending on your Next.js output
  server: {
    url: 'https://ethlink-app.vercel.app',   // your live Vercel URL
    cleartext: true,                         // allows HTTP traffic when needed
  },
  android: {
    allowMixedContent: true,                 // ← This was in the wrong place
    backgroundColor: '#0B0C15',
    webContentsDebuggingEnabled: true,       // helpful for debugging
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 2000,
      backgroundColor: '#0B0C15',
    },
  },
};

export default config;