import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaultos.app',
  appName: 'VaultOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'localhost',
      'capacitor://localhost',
      'http://localhost',
      'https://localhost',
      'jstore.2bd.net',
      'ais-pre-fepxpuaneshwmjc7uli267-8797777129.asia-east1.run.app'
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
