import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'

export interface LanguageReading {
  source: '브라우저' | '기기'
  tag: string
}

export async function readLanguage(): Promise<LanguageReading> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Device.getLanguageTag()
    return { source: '기기', tag: value }
  }

  return { source: '브라우저', tag: navigator.language }
}
