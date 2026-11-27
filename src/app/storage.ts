import { Capacitor } from '@capacitor/core'
import { appSlug } from './branding'
import {
  appReducer, createInitialState, normalizeQuickFoods, type AppAction, type AppState, type Profile,
} from './model'
import { reconcileTracking, trackingData, trackingOperation, type TrackingData, type TrackingOperation } from './tracking-changes'

export const ownerFoodCachePrefix = `${appSlug}-private-foods-v1:`
const accountStatePrefix = `${appSlug}-account-state-v1:`
const onboardingKey = `${appSlug}-onboarding-v1`
export const previousOwnerFoodCachePrefix = 'protein-private-foods-v1:'
const previousAccountStatePrefix = 'protein-account-state-v1:'
const previousOnboardingKey = 'protein-onboarding-v1'
const legacyKey = 'protein-checked-state-v1'
const onboardingStorage = () => Capacitor.isNativePlatform() ? window.localStorage : window.sessionStorage

type SetupDraft = { profile: Profile; goalG: number }
type Onboarding = { login: boolean; setup?: SetupDraft }
type StoredAccount = AppState & { tracking?: { revision: number | null; pending: TrackingOperation[] } }
type Snapshot = { state: StoredAccount; saveError: boolean }
type LegacyState = Partial<AppState> & {
  accountFoodPreferences?: Record<string, Pick<Partial<AppState>, 'favoriteFoodIds' | 'quickFoodIds'>>
}

const initial = createInitialState()
const signedOut: Snapshot = { state: initial, saveError: false }
const snapshots = new Map<string, Snapshot>()
const listeners = new Set<() => void>()

function readOnboarding(): Onboarding {
  try {
    const storage = onboardingStorage()
    const raw = storage.getItem(onboardingKey) ?? storage.getItem(previousOnboardingKey)
    const saved = raw ? JSON.parse(raw) as Partial<Onboarding> : null
    if (saved && typeof saved.login === 'boolean') {
      const { login, setup } = saved
      const validSetup = setup?.profile && Number.isFinite(setup.goalG) &&
        Number.isFinite(setup.profile.heightCm) && Number.isFinite(setup.profile.weightKg)
      return { login, setup: validSetup ? setup : undefined }
    }
  } catch { /* Start at the welcome screen if tab storage is unavailable. */ }
  return { login: false }
}

let onboarding = readOnboarding()

function readLegacyState(): LegacyState | null {
  try {
    const raw = localStorage.getItem(legacyKey)
    const legacy = raw ? JSON.parse(raw) as LegacyState : null
    return legacy?.schemaVersion === 1 ? legacy : null
  } catch {
    return null
  }
}

function readAccountState(ownerId: string): StoredAccount {
  try {
    const raw = localStorage.getItem(accountStatePrefix + ownerId)
      ?? localStorage.getItem(previousAccountStatePrefix + ownerId)
    if (raw) {
      const saved = JSON.parse(raw) as StoredAccount
      if (saved?.schemaVersion === 1 && Array.isArray(saved.records) && Array.isArray(saved.favoriteFoodIds)) {
        return {
          ...initial,
          ...saved,
          profile: { ...initial.profile, ...saved.profile },
          profileConfigured: saved.profileConfigured === true,
          eveningReminderEnabled: saved.eveningReminderEnabled === true,
          quickFoodIds: Array.isArray(saved.quickFoodIds) ? normalizeQuickFoods(saved.quickFoodIds) : initial.quickFoodIds,
        }
      }
    }

    const saved = readLegacyState()
    if (!saved) return initial
    // The old device store mixed guest data and linked accounts. Only restore
    // entries previously associated with this account.
    const preferences = saved.accountFoodPreferences?.[ownerId]
    return {
      ...initial,
      favoriteFoodIds: preferences?.favoriteFoodIds ?? initial.favoriteFoodIds,
      quickFoodIds: preferences?.quickFoodIds ? normalizeQuickFoods(preferences.quickFoodIds) : initial.quickFoodIds,
      records: Array.isArray(saved.records) ? saved.records.filter((record) => record.ownerId === ownerId) : [],
    }
  } catch {
    return initial
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function storageChanged(event: StorageEvent) {
  if (event.storageArea !== window.localStorage) return
  if (event.key === null || event.key === legacyKey) snapshots.clear()
  else if (event.key.startsWith(accountStatePrefix)) snapshots.delete(event.key.slice(accountStatePrefix.length))
  else if (event.key.startsWith(previousAccountStatePrefix)) snapshots.delete(event.key.slice(previousAccountStatePrefix.length))
  else return
  notify()
}

export function subscribeState(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', storageChanged)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', storageChanged)
  }
}

export function getSnapshot(ownerId?: string): Snapshot {
  if (!ownerId) return signedOut
  const cached = snapshots.get(ownerId)
  if (cached) return cached
  const loaded = { state: readAccountState(ownerId), saveError: false }
  snapshots.set(ownerId, loaded)
  return loaded
}

function saveAccountState(ownerId: string, state: StoredAccount) {
  try {
    localStorage.setItem(accountStatePrefix + ownerId, JSON.stringify(state))
    localStorage.removeItem(previousAccountStatePrefix + ownerId)
    snapshots.set(ownerId, { state, saveError: false })
  } catch {
    snapshots.set(ownerId, { state, saveError: true })
  }
  notify()
}

function latestAccountState(ownerId: string) {
  const current = getSnapshot(ownerId)
  return current.saveError ? current.state : readAccountState(ownerId)
}

export function dispatch(ownerId: string, action: AppAction) {
  const current = latestAccountState(ownerId)
  const state = appReducer(current, action)
  const operation = trackingOperation(action, state)
  saveAccountState(ownerId, {
    ...state,
    tracking: operation
      ? { revision: current.tracking?.revision ?? null, pending: [...(current.tracking?.pending ?? []), operation] }
      : current.tracking,
  })
}

export function trackingBatch(ownerId: string) {
  const state = latestAccountState(ownerId)
  const seed = state.tracking?.revision != null ? null : {
    ...trackingData(state),
    importFavorites: state.favoriteFoodIds.length > 0,
    importQuick: JSON.stringify(state.quickFoodIds) !== JSON.stringify(initial.quickFoodIds),
  }
  return {
    seed,
    operations: state.tracking?.pending ?? [],
  }
}

export function acceptTracking(ownerId: string, remote: TrackingData & { revision: number }, sent: readonly TrackingOperation[]) {
  const current = latestAccountState(ownerId)
  const acknowledged = new Set(sent.map(({ id }) => id))
  const pending = (current.tracking?.pending ?? []).filter(({ id }) => !acknowledged.has(id))
  const currentRevision = current.tracking?.revision ?? -1
  const useRemote = remote.revision >= currentRevision
  if (remote.revision === currentRevision && !sent.length && !getSnapshot(ownerId).saveError) return true
  saveAccountState(ownerId, {
    ...current,
    ...(useRemote ? reconcileTracking(remote, pending) : {}),
    tracking: { revision: Math.max(currentRevision, remote.revision), pending },
  })
  return useRemote
}

export const getOnboarding = () => onboarding

export function saveOnboarding(progress: Onboarding) {
  onboarding = progress
  try {
    const storage = onboardingStorage()
    if (progress.login || progress.setup) storage.setItem(onboardingKey, JSON.stringify(progress))
    else storage.removeItem(onboardingKey)
    storage.removeItem(previousOnboardingKey)
  } catch { /* The current onboarding screen can still proceed in memory. */ }
  notify()
}

export function clearAfterWithdrawal(ownerId: string) {
  try {
    const legacy = readLegacyState()
    if (legacy) {
      if (legacy.accountFoodPreferences) delete legacy.accountFoodPreferences[ownerId]
      if (Array.isArray(legacy.records)) legacy.records = legacy.records.filter((record) => record.ownerId !== ownerId)
      localStorage.setItem(legacyKey, JSON.stringify(legacy))
    }
    localStorage.removeItem(accountStatePrefix + ownerId)
    localStorage.removeItem(previousAccountStatePrefix + ownerId)
    localStorage.removeItem(ownerFoodCachePrefix + ownerId)
    localStorage.removeItem(previousOwnerFoodCachePrefix + ownerId)
  } catch {
    return false
  }
  snapshots.delete(ownerId)
  notify()
  return true
}
