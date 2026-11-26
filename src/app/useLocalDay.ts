import { useSyncExternalStore } from 'react'
import { toLocalDate } from './model'

function subscribeToDayChange(notify: () => void) {
  let timer: number
  function scheduleMidnight() {
    const now = new Date()
    const nextDay = new Date(now)
    nextDay.setHours(24, 0, 0, 0)
    window.clearTimeout(timer)
    timer = window.setTimeout(refresh, nextDay.getTime() - now.getTime())
  }
  function refresh() {
    notify()
    scheduleMidnight()
  }

  scheduleMidnight()
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('pageshow', refresh)
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('pageshow', refresh)
  }
}

export function useLocalDay() {
  return useSyncExternalStore(subscribeToDayChange, toLocalDate)
}
