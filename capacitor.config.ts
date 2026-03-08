const config = {
  appId: 'com.vaultos.app',
  appName: 'VaultOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      showSpinner: false
    }
  }
}

export default config
