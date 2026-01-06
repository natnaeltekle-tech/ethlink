import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethlink.app',
  appName: 'EthLink',
  webDir: 'public', // This doesn't matter if we use server url
  server: {
    url: 'https://ethlink-app.vercel.app', // Your Live URL
    cleartext: true
  }
};

export default config;