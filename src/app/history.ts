import { roundProtein, type ProteinRecord } from './model'

const dayMs = 24 * 60 * 60 * 1000

// ISO date keys can be shifted in UTC without changing a local calendar day at DST boundaries.
export function historyDate(today: string, offset: number) {
  return new Date(Date.parse(today) + offset * dayMs).toISOString().slice(0, 10)
}

export function historyOffset(today: string, date: string) {
  return (Date.parse(date) - Date.parse(today)) / dayMs
}

export function historyWeekEnd(offset: number) {
  return offset > -7 ? 0 : Math.ceil(offset / 7) * 7
}

export function historyTotals(records: readonly ProteinRecord[]) {
  const totals = new Map<string, number>()
  for (const { localDate, proteinG } of records) {
    totals.set(localDate, roundProtein((totals.get(localDate) ?? 0) + proteinG))
  }
  return totals
}

export function historyPercent(total: number, goal: number) {
  return Math.floor((total * 100) / Math.max(1, goal))
}

export function historyGoalStreak(totals: ReadonlyMap<string, number>, today: string, goal: number) {
  const target = Math.max(1, goal)
  const firstOffset = (totals.get(today) ?? 0) >= target ? 0 : -1
  let streak = 0
  while ((totals.get(historyDate(today, firstOffset - streak)) ?? 0) >= target) {
    streak += 1
  }
  return streak
}
