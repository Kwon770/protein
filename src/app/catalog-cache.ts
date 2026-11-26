import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { accountAvailable } from './account'
import { appSlug } from './branding'
import { FOOD_CATALOG, type CatalogFood } from './data'
import { isFoodCacheVersion, watchFoodCache } from './food-cache-watch'
import type { FoodPortion } from './model'

const catalogOrigin = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const cacheKey = `${appSlug}-food-catalog-v3:${catalogOrigin}`
const previousCacheKey = `protein-food-catalog-v3:${catalogOrigin}`
const pageSize = 200
const servingUnits: readonly FoodPortion['unit'][] = ['개', '회분', '컵', '그릇', '팩', '병']
const columns = 'id,name,protein_g,kind,category,description,serving_amount,serving_unit,search_terms,icon_id,sort_order,source_url'

function isServingUnit(value: unknown): value is FoodPortion['unit'] {
  return servingUnits.some((unit) => unit === value)
}

function decodeFood(value: unknown): CatalogFood | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const { id, name, protein_g: proteinG, kind, category, description } = row
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !name.trim()
    || typeof proteinG !== 'number' || !Number.isFinite(proteinG) || proteinG <= 0
    || (kind !== 'food' && kind !== 'meal') || typeof category !== 'string' || typeof description !== 'string') return null

  const base = { id, name, proteinG, category, description, iconId: typeof row.icon_id === 'string' ? row.icon_id : undefined }
  const searchTerms = Array.isArray(row.search_terms) && row.search_terms.every((term) => typeof term === 'string')
    ? row.search_terms as string[] : []
  const { serving_amount: amount, serving_unit: unit } = row
  if (kind === 'meal') {
    return amount === null && unit === null ? { ...base, kind, searchTerms } : null
  }
  if (amount !== 1 || !isServingUnit(unit)) return null
  const sourceUrl = typeof row.source_url === 'string' && row.source_url.startsWith('https://') ? row.source_url : undefined
  return { ...base, kind, serving: { amount, unit }, searchTerms, sourceUrl }
}

function decodeCatalog(rows: unknown): CatalogFood[] | null {
  if (!Array.isArray(rows)) return null
  const foods: CatalogFood[] = []
  const ids = new Set<string>()
  for (const row of rows) {
    const food = decodeFood(row)
    if (!food || ids.has(food.id)) return null
    ids.add(food.id)
    foods.push(food)
  }
  return foods
}

function readCache() {
  if (!accountAvailable) return null
  try {
    const raw = window.localStorage.getItem(cacheKey) ?? window.localStorage.getItem(previousCacheKey)
    if (!raw) return null
    const { version, rows } = JSON.parse(raw)
    const foods = decodeCatalog(rows)
    if (!foods) return null
    return { foods, version: isFoodCacheVersion(version) ? version : null }
  } catch {
    return null
  }
}

const cached = readCache()
const listeners = new Set<() => void>()
let foods: readonly CatalogFood[] = cached?.foods ?? FOOD_CATALOG
let version = cached?.version ?? null
let stopWatching: (() => void) | undefined

async function loadCatalog(client: SupabaseClient, signal: AbortSignal) {
  const diskVersion = readCache()?.version ?? null
  const rows: unknown[] = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from('food_catalog')
      .select(columns)
      .order('sort_order')
      .order('id')
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal)
    if (error || !data) throw new Error('Could not load the public food catalog')
    rows.push(...data)
    if (data.length < pageSize) break
  }

  const next = decodeCatalog(rows)
  if (!next) throw new Error('Invalid public food catalog')
  return (confirmedVersion: number) => {
    const disk = readCache()
    if (disk?.version != null && disk.version > confirmedVersion && disk.version !== diskVersion) {
      publishSnapshot(disk.foods, disk.version)
      return
    }
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify({ version: confirmedVersion, rows }))
      window.localStorage.removeItem(previousCacheKey)
    } catch { /* Keep the current list available in memory. */ }
    publishSnapshot(next, confirmedVersion)
  }
}

function publishSnapshot(next: readonly CatalogFood[], confirmedVersion: number) {
  foods = next
  version = confirmedVersion
  for (const notify of listeners) notify()
}

function onStorage(event: StorageEvent) {
  if (event.key !== cacheKey && event.key !== previousCacheKey) return
  const latest = readCache()
  if (latest?.version == null || (version !== null && latest.version <= version)) return
  publishSnapshot(latest.foods, latest.version)
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  if (listeners.size === 1 && accountAvailable) {
    window.addEventListener('storage', onStorage)
    stopWatching = watchFoodCache({ scope: 'catalog', version: () => version, load: loadCatalog })
  }
  return () => {
    listeners.delete(notify)
    if (!listeners.size && accountAvailable) {
      window.removeEventListener('storage', onStorage)
      stopWatching?.()
      stopWatching = undefined
    }
  }
}

function getSnapshot() {
  return foods
}

export function useFoodCatalog(): readonly CatalogFood[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}
