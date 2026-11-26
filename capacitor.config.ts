import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sckwon770.waytogo',
  appName: 'Way to Go',
  webDir: 'dist',
  loggingBehavior: 'none',
  plugins: {
    LocalNotifications: { presentationOptions: ['banner', 'list'] },
    SystemBars: { style: 'DARK' },
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
