import { normalizeQuickFoods, type AppAction, type AppState, type ProteinRecord } from './model'

export type TrackingData = Pick<AppState, 'records' | 'favoriteFoodIds'> & { quickFoodIds: string[] }

export type TrackingOperation = { id: string } & (
  | { type: 'record'; recordId: string; record: ProteinRecord | null; create: boolean }
  | { type: 'favorite'; foodId: string; saved: boolean }
  | { type: 'quick'; foodIds: string[] }
)

export function trackingData({ records, favoriteFoodIds, quickFoodIds }: AppState): TrackingData {
  return { records, favoriteFoodIds, quickFoodIds: quickFoodIds ?? [] }
}

function operationId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

export function trackingOperation(action: AppAction, next: AppState): TrackingOperation | undefined {
  switch (action.type) {
    case 'ADD_RECORD':
      return { id: operationId(), type: 'record', recordId: action.record.id, record: action.record, create: true }
    case 'UPDATE_RECORD': {
      const record = next.records.find(({ id }) => id === action.recordId)
      if (record) return { id: operationId(), type: 'record', recordId: record.id, record, create: false }
      break
    }
    case 'DELETE_RECORD':
      return { id: operationId(), type: 'record', recordId: action.recordId, record: null, create: false }
    case 'TOGGLE_FAVORITE':
      return { id: operationId(), type: 'favorite', foodId: action.foodId, saved: next.favoriteFoodIds.includes(action.foodId) }
    case 'SET_QUICK_FOODS':
      return { id: operationId(), type: 'quick', foodIds: normalizeQuickFoods(action.foodIds) }
  }
}

export function reconcileTracking(remote: TrackingData, pending: readonly TrackingOperation[]): TrackingData {
  const records = new Map(remote.records.map((record) => [record.id, record]))
  let { favoriteFoodIds, quickFoodIds } = remote
  for (const operation of pending) {
    switch (operation.type) {
      case 'record':
        if (!operation.record) records.delete(operation.recordId)
        else if (operation.create || records.has(operation.recordId)) records.set(operation.recordId, operation.record)
        break
      case 'favorite':
        if (operation.saved) {
          if (!favoriteFoodIds.includes(operation.foodId)) favoriteFoodIds = [operation.foodId, ...favoriteFoodIds]
        } else {
          favoriteFoodIds = favoriteFoodIds.filter((id) => id !== operation.foodId)
        }
        break
      case 'quick':
        quickFoodIds = operation.foodIds
    }
  }
  return { records: [...records.values()], favoriteFoodIds, quickFoodIds }
}
