import { useEffect, useState } from 'react'
import { getAccountSnapshot, getSupabaseClient } from './account'
import { acceptTracking, getSnapshot, subscribeState, trackingBatch } from './storage'
import type { TrackingData } from './tracking-changes'

type RemoteTracking = TrackingData & { revision: number }

function isRemoteTracking(value: unknown): value is RemoteTracking {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<RemoteTracking>
  return Array.isArray(data.records) && Array.isArray(data.favoriteFoodIds)
    && Array.isArray(data.quickFoodIds) && Number.isSafeInteger(data.revision)
}

export function useAccountTracking(ownerId?: string) {
  const [failedOwner, setFailedOwner] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerId) return
    const owner = ownerId
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && getAccountSnapshot().user?.id === owner
    let timer: number | undefined
    let running = false
    let delay = 0

    function schedule(wait = delay) {
      if (!current() || running || timer !== undefined) return
      timer = window.setTimeout(() => {
        timer = undefined
        void synchronize()
      }, wait)
    }

    async function synchronize() {
      if (!current()) return
      running = true
      let refreshSnapshot = false
      try {
        const client = await getSupabaseClient()
        if (!current()) return
        if (!client) throw new Error('Account unavailable')
        const batch = trackingBatch(owner)
        const { data, error } = await client.rpc('sync_account_tracking', {
          p_owner: owner,
          p_seed: batch.seed,
          p_operations: batch.operations,
        }).abortSignal(controller.signal)
        if (!current()) return
        if (error || !isRemoteTracking(data)) throw new Error('Tracking sync failed')
        refreshSnapshot = !acceptTracking(owner, data, batch.operations)
        setFailedOwner(null)
        delay = 0
      } catch {
        if (!current()) return
        setFailedOwner(owner)
        delay = delay ? Math.min(delay * 2, 60_000) : 4000
      } finally {
        running = false
        if (current() && (delay || refreshSnapshot || hasPending())) schedule()
      }
    }

    function hasPending() {
      return Boolean(getSnapshot(owner).state.tracking?.pending.length)
    }

    function refresh() {
      if (document.visibilityState === 'hidden') return
      window.clearTimeout(timer)
      timer = undefined
      schedule(0)
    }

    const unsubscribe = subscribeState(() => {
      if (hasPending()) schedule()
    })
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    schedule()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [ownerId])

  return Boolean(ownerId && failedOwner === ownerId)
}
