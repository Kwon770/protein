import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from './account'

const versionTable = 'food_cache_versions'
const requestTimeoutMs = 15_000
const retryDelaysMs = [1_000, 2_000, 4_000]
let channelSequence = 0

export function isFoodCacheVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isOnline() {
  return navigator.onLine !== false
}

async function readVersion(client: SupabaseClient, scope: string, signal: AbortSignal) {
  const { data, error } = await client.from(versionTable).select('version')
    .eq('scope', scope).abortSignal(signal).maybeSingle()
  if (error) throw error
  if (isFoodCacheVersion(data?.version)) return data.version
  if (!data && scope.startsWith('user:')) return 0
  throw new Error('Food cache version is unavailable')
}

type WatchOptions = {
  scope: string
  version: () => number | null
  load: (client: SupabaseClient, signal: AbortSignal) => Promise<(version: number) => void>
}

export function watchFoodCache({ scope, version, load }: WatchOptions) {
  let client: SupabaseClient | null = null
  let channel: RealtimeChannel | undefined
  let activeRequest: AbortController | undefined
  let retryTimer: number | undefined
  let retryCount = 0
  let requested = false
  let checking = false
  let stopped = false

  function clearRetry() {
    if (retryTimer === undefined) return
    window.clearTimeout(retryTimer)
    retryTimer = undefined
  }

  async function refresh(connectedClient: SupabaseClient) {
    checking = true
    try {
      while (requested && !stopped && isOnline()) {
        requested = false
        const controller = new AbortController()
        activeRequest = controller
        const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs)
        try {
          const latest = await readVersion(connectedClient, scope, controller.signal)
          if (stopped) return
          controller.signal.throwIfAborted()
          if (latest !== version()) {
            const commit = await load(connectedClient, controller.signal)
            const confirmed = await readVersion(connectedClient, scope, controller.signal)
            if (confirmed !== latest) throw new Error('Food list changed during download')
            if (!stopped && !controller.signal.aborted && confirmed !== version()) commit(confirmed)
          }
          retryCount = 0
        } catch {
          if (!requested && !stopped && isOnline() && retryCount < retryDelaysMs.length) {
            retryTimer = window.setTimeout(() => {
              retryTimer = undefined
              requested = true
              void refresh(connectedClient)
            }, retryDelaysMs[retryCount++])
          }
        } finally {
          window.clearTimeout(timeout)
          activeRequest = undefined
        }
      }
    } finally {
      checking = false
    }
  }

  function requestCheck() {
    if (!client || stopped || !isOnline()) return
    clearRetry()
    retryCount = 0
    requested = true
    if (!checking) void refresh(client)
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') requestCheck()
  }

  window.addEventListener('online', requestCheck)
  document.addEventListener('visibilitychange', onVisibility)

  const nativeListener = Capacitor.isNativePlatform() ? App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) requestCheck()
  }).catch(() => undefined) : undefined

  void getSupabaseClient().then((connectedClient) => {
    if (!connectedClient || stopped) return
    client = connectedClient
    const filter = { schema: 'public', table: versionTable, filter: `scope=eq.${scope}` }
    try {
      channel = client.channel(`food-cache:${scope}:${++channelSequence}`, {
        config: { postgres_changes_options: { wait: true } },
      })
      channel
        .on('postgres_changes', { ...filter, event: 'INSERT' }, requestCheck)
        .on('postgres_changes', { ...filter, event: 'UPDATE' }, requestCheck)
        .subscribe((status) => { if (status === 'SUBSCRIBED') requestCheck() })
    } finally {
      requestCheck()
    }
  }).catch(() => { /* The cached list remains available if Realtime is unavailable. */ })

  return () => {
    stopped = true
    clearRetry()
    activeRequest?.abort()
    window.removeEventListener('online', requestCheck)
    document.removeEventListener('visibilitychange', onVisibility)
    void nativeListener?.then((listener) => listener?.remove()).catch(() => {})
    if (client && channel) void client.removeChannel(channel).catch(() => {})
  }
}
