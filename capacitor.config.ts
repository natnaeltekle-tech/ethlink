import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlink.app',
  appName: 'EthLink',
  webDir: 'public', // This doesn't matter if we use server url
  server: {
    url: 'https://ethlink-app.vercel.app', // Your Live URL
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Show indefinitely until we hide it
      backgroundColor: '#0B0C15', // Match app's dark background
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  }
};

export default config;