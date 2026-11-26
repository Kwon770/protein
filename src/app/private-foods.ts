import { useEffect, useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccountSnapshot, getSupabaseClient } from './account'
import { isFoodCacheVersion, watchFoodCache } from './food-cache-watch'
import type { CustomFood } from './model'
import { ownerFoodCachePrefix, previousOwnerFoodCachePrefix } from './storage'

type Cache = { foods: readonly CustomFood[]; version: number | null }
type FoodRow = { id: string; name: string; protein_g: number; icon_id: string | null; is_deleted: boolean }
const empty: Cache = { foods: [], version: null }
const pageSize = 500
const caches = new Map<string, Cache>()
const cacheGenerations = new Map<string, number>()
const pendingWrites = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()
const columns = 'id,name,protein_g,icon_id,is_deleted'

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getCache(owner: string) {
  const known = caches.get(owner)
  if (known) return known
  let cache = empty
  try {
    const raw = localStorage.getItem(ownerFoodCachePrefix + owner)
      ?? localStorage.getItem(previousOwnerFoodCachePrefix + owner)
    const saved = raw ? JSON.parse(raw) as Cache : null
    if (saved && Array.isArray(saved.foods)) {
      const { version, foods } = saved
      cache = { foods, version: isFoodCacheVersion(version) ? version : null }
    }
  } catch { /* The server remains the source of truth. */ }
  caches.set(owner, cache)
  return cache
}

function publish(owner: string, cache: Cache) {
  caches.set(owner, cache)
  try {
    localStorage.setItem(ownerFoodCachePrefix + owner, JSON.stringify(cache))
    localStorage.removeItem(previousOwnerFoodCachePrefix + owner)
  } catch { /* Keep the current session usable if disk storage is full. */ }
  for (const listener of listeners) listener()
}

function fromRow(row: FoodRow): CustomFood {
  return {
    id: row.id, name: row.name, proteinG: row.protein_g, iconId: row.icon_id ?? undefined,
    isDeleted: row.is_deleted,
  }
}

async function loadPrivateFoods(owner: string, client: SupabaseClient, signal: AbortSignal) {
  const generation = cacheGenerations.get(owner)
  await pendingWrites.get(owner)?.catch(() => {})
  const before = getCache(owner)
  const isCurrent = () => !signal.aborted && getAccountSnapshot().user?.id === owner && cacheGenerations.get(owner) === generation
  const foods = new Map<string, CustomFood>()
  for (let from = 0; ; from += pageSize) {
    if (!isCurrent()) throw new Error('Inactive food account')
    const { data, error } = await client.from('user_foods').select(columns)
      .eq('user_id', owner).order('id').range(from, from + pageSize - 1).abortSignal(signal)
    if (error || !data) throw new Error('Private foods unavailable')
    const rows = data as FoodRow[]
    for (const row of rows) foods.set(row.id, fromRow(row))
    if (rows.length < pageSize) break
  }

  return (version: number) => {
    if (!isCurrent()) return
    if (pendingWrites.has(owner)) throw new Error('Private food write in progress')
    const previous = new Map(before.foods.map((food) => [food.id, food]))
    let hasLocalChanges = false
    for (const food of getCache(owner).foods) {
      if (previous.get(food.id) === food) continue
      const loaded = foods.get(food.id)
      if (loaded?.name === food.name && loaded.proteinG === food.proteinG &&
        loaded.iconId === food.iconId && loaded.isDeleted === food.isDeleted) continue
      // Keep a write that finished during this read until its revision is reconciled.
      foods.set(food.id, food)
      hasLocalChanges = true
    }
    publish(owner, { foods: [...foods.values()], version: hasLocalChanges ? null : version })
  }
}

export function usePrivateFoods(owner: string | undefined) {
  const cache = useSyncExternalStore(subscribe, () => owner ? getCache(owner) : empty)
  useEffect(() => {
    if (!owner) return
    return watchFoodCache({
      scope: `user:${owner}`,
      version: () => getCache(owner).version,
      load: (client, signal) => loadPrivateFoods(owner, client, signal),
    })
  }, [owner])
  return cache.foods
}

async function writePrivateFood(
  owner: string,
  write: (client: SupabaseClient) => PromiseLike<{ data: FoodRow | null; error: unknown }>,
) {
  const generation = cacheGenerations.get(owner)
  const previousWrite = pendingWrites.get(owner)
  const pending = (async () => {
    // Publish local writes in the order they reach the database.
    await previousWrite?.catch(() => {})
    const client = await getSupabaseClient()
    const isCurrent = () => getAccountSnapshot().user?.id === owner && cacheGenerations.get(owner) === generation
    if (!client || !isCurrent()) throw new Error('Sign-in required')
    const { data, error } = await write(client)
    if (error || !data || !isCurrent()) throw new Error('Food write failed')
    const before = getCache(owner)
    const next = new Map(before.foods.map((saved) => [saved.id, saved]))
    next.set(data.id, fromRow(data))
    publish(owner, { foods: [...next.values()], version: before.version })
  })()
  pendingWrites.set(owner, pending)
  try {
    await pending
  } finally {
    if (pendingWrites.get(owner) === pending) pendingWrites.delete(owner)
  }
}

export function savePrivateFood(owner: string, food: CustomFood) {
  const row = {
    user_id: owner, id: food.id, name: food.name, protein_g: food.proteinG,
    icon_id: food.iconId ?? null, is_deleted: false,
  }
  return writePrivateFood(owner, (client) => client.from('user_foods')
    .upsert(row, { onConflict: 'user_id,id' }).select(columns).single<FoodRow>())
}

export function deletePrivateFood(owner: string, foodId: string) {
  return writePrivateFood(owner, (client) => client.from('user_foods').update({ is_deleted: true })
    .eq('user_id', owner).eq('id', foodId).select(columns).single<FoodRow>())
}

export function clearPrivateFoodCache(owner: string) {
  cacheGenerations.set(owner, (cacheGenerations.get(owner) ?? 0) + 1)
  caches.delete(owner)
  try {
    localStorage.removeItem(ownerFoodCachePrefix + owner)
    localStorage.removeItem(previousOwnerFoodCachePrefix + owner)
  } catch { /* storage unavailable */ }
  for (const listener of listeners) listener()
}
