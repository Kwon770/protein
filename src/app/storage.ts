import { Capacitor } from '@capacitor/core'
import { appSlug } from './branding'
import {
  appReducer, createInitialState, normalizeQuickFoods, type AppAction, type AppState, type Profile,
} from './model'

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
type Snapshot = { state: AppState; saveError: boolean }
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

function readAccountState(ownerId: string): AppState {
  try {
    const raw = localStorage.getItem(accountStatePrefix + ownerId)
      ?? localStorage.getItem(previousAccountStatePrefix + ownerId)
    if (raw) {
      const saved = JSON.parse(raw) as AppState
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

export function dispatch(ownerId: string, action: AppAction) {
  const current = getSnapshot(ownerId)
  const state = appReducer(current.saveError ? current.state : readAccountState(ownerId), action)
  try {
    localStorage.setItem(accountStatePrefix + ownerId, JSON.stringify(state))
    localStorage.removeItem(previousAccountStatePrefix + ownerId)
    snapshots.set(ownerId, { state, saveError: false })
  } catch {
    snapshots.set(ownerId, { state, saveError: true })
  }
  notify()
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
