import { useId, useRef, useState } from 'react'
import { Check, Ellipsis, PenLine, Plus } from 'lucide-react'
import type { CatalogFood } from '../app/data'
import { historyDate, historyGoalStreak, historyTotals } from '../app/history'
import { MAX_QUICK_FOODS, roundProtein, type AppState } from '../app/model'
import { useLocalDay } from '../app/useLocalDay'
import { FoodIcon } from '../components/FoodIcon'
import { ProteinShaker } from '../components/ProteinShaker'
import { QuickFoodsDialog } from './QuickFoodsDialog'
import './home.css'

type Props = {
  state: AppState
  foods: readonly CatalogFood[]
  onPickFood: (item: CatalogFood, trigger: HTMLButtonElement) => void
  onManualEntry: (trigger: HTMLButtonElement) => void
  onSaveQuickFoods: (foodIds: string[]) => void
}

const dateFormat = new Intl.DateTimeFormat('ko', { month: 'long', day: 'numeric', weekday: 'long' })
const streakLevels = [
  { days: 365, name: 'blaze' },
  { days: 90, name: 'roaring' },
  { days: 30, name: 'flicker' },
  { days: 10, name: 'sway' },
  { days: 1, name: 'ember' },
  { days: 0, name: 'cold' },
]

function StreakFlame({ days }: { days: number }) {
  const gradientId = useId()

  return (
    <span className="home-streak-flame" aria-hidden="true" data-wide={days > 999 || undefined}>
      <svg viewBox="0 0 64 68" className="home-streak-art">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop className="home-streak-flame-tip" />
            <stop className="home-streak-flame-base" offset="1" />
          </linearGradient>
        </defs>
        <g className="home-streak-tongues">
          <path fill={`url(#${gradientId})`} d="M32 66C16 66 5 56 5 43c0-10 5-16 12-24 0 6 2 10 6 12C30 23 32 12 29 3c13 7 20 16 19 27 4-2 7-5 8-11 5 8 7 16 6 25-1 13-13 22-30 22Z" />
          <path className="home-streak-core" d="M33 63c-11 0-18-6-18-14 0-6 4-11 9-17 0 4 2 6 5 8 6-6 8-13 7-21 8 6 11 13 10 20 3-2 5-5 6-8 3 6 4 12 2 18-3 9-11 14-21 14Z" />
        </g>
        <g className="home-streak-sparks">
          <circle cx="9" cy="29" r="1.6" />
          <circle cx="49" cy="13" r="1.5" />
          <circle cx="19" cy="14" r="1.15" />
        </g>
      </svg>
      <span className="home-streak-count">{days}</span>
    </span>
  )
}

export function HomeScreen({ state, foods, onPickFood, onManualEntry, onSaveQuickFoods }: Props) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const slotButtons = useRef(new Map<number, HTMLButtonElement>())
  const editButtons = useRef(new Map<number, HTMLButtonElement>())
  const today = useLocalDay()
  const goal = Math.max(1, state.goalG)
  const totals = historyTotals(state.records)
  const consumed = totals.get(today) ?? 0
  const difference = roundProtein(goal - consumed)
  const streak = historyGoalStreak(totals, today, goal)
  const streakLevel = streakLevels.find((level) => streak >= level.days)?.name
  const todayLabel = dateFormat.format(new Date(today + 'T12:00:00'))
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = historyDate(today, index - 6)
    return { date, achieved: (totals.get(date) ?? 0) >= goal }
  })
  const savedIds = state.quickFoodIds ?? []
  const slots = Array.from({ length: MAX_QUICK_FOODS }, (_, index) =>
    foods.find((food) => food.id === savedIds[index]),
  )

  function closeEditor() {
    const index = editingSlot
    setEditingSlot(null)
    if (index === null) return
    const returnToOptions = Boolean(slots[index])
    requestAnimationFrame(() => {
      const options = returnToOptions ? editButtons.current.get(index) : undefined
      const button = options ?? slotButtons.current.get(index)
      button?.focus({ preventScroll: true })
    })
  }

  function saveSlot(foodId: string) {
    if (editingSlot === null) return

    const next = Array.from({ length: MAX_QUICK_FOODS }, (_, index) => savedIds[index] ?? '')
    const previousSlot = foodId ? next.indexOf(foodId) : -1
    if (previousSlot !== -1) next[previousSlot] = next[editingSlot]
    next[editingSlot] = foodId
    onSaveQuickFoods(next)
    closeEditor()
  }

  return (
    <div className="home-summary">
      <h1 className="sr-only">오늘의 요약</h1>
      <div className="home-date-row">
        <time dateTime={today}>{todayLabel}</time>
        <div className="home-streak" data-heat={streakLevel} role="group" aria-label="최근 7일 단백질 목표 달성">
          <ol className="home-streak-days" role="list">
            {week.map(({ date, achieved }) => (
              <li key={date} className="home-streak-day" data-achieved={achieved || undefined}>
                {achieved && <Check size={9} strokeWidth={3} aria-hidden="true" />}
                <span className="sr-only">
                  <time dateTime={date} aria-current={date === today ? 'date' : undefined}>
                    {dateFormat.format(new Date(date + 'T12:00:00'))}
                  </time> {achieved ? '달성' : '미달성'}
                </span>
              </li>
            ))}
          </ol>
          <StreakFlame days={streak} />
          <span className="sr-only">{streak}일 연속 달성</span>
        </div>
      </div>
      <section className="panel intake-panel" aria-labelledby="intake-heading">
        <div className="intake-reading">
          <div className="intake-numbers">
            <h2 id="intake-heading">단백질 섭취량</h2>
            <p className="consumed">
              <strong>{consumed}</strong>
              <span>g</span>
            </p>
            <p className="goal-caption">목표 {goal}g</p>
            <p className="remaining">
              {difference > 0 ? (
                <>
                  <b>{difference}g</b> 남았어요
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden="true" />
                  {difference < 0 ? `${Math.abs(difference)}g 초과 달성` : '목표를 달성했어요'}
                </>
              )}
            </p>
          </div>
          <div className="intake-graphic">
            <ProteinShaker value={consumed} max={goal} />
          </div>
        </div>
      </section>

      <section className="home-quick" aria-labelledby="quick-title">
        <h2 id="quick-title">빠른 기록</h2>
        <ol className="quick-foods">
          {slots.map((item, index) => (
            <li className="quick-slot" key={index}>
              <button
                ref={(button) => {
                  if (button) slotButtons.current.set(index, button)
                  else slotButtons.current.delete(index)
                }}
                className={item ? 'quick-food' : 'quick-food quick-food-empty'}
                type="button"
                onClick={(event) => {
                  if (item) onPickFood(item, event.currentTarget)
                  else setEditingSlot(index)
                }}
                aria-label={item ? `${item.name} 섭취량 입력` : `${index + 1}번 빠른 기록 추가`}
                aria-haspopup="dialog"
              >
                {item ? (
                  <FoodIcon id={item.id} iconId={item.iconId} />
                ) : (
                  <Plus size={22} aria-hidden="true" />
                )}
                <span>{item?.name ?? '추가'}</span>
              </button>
              {item && (
                <button
                  ref={(button) => {
                    if (button) editButtons.current.set(index, button)
                    else editButtons.current.delete(index)
                  }}
                  className="quick-slot-options"
                  type="button"
                  aria-label={`${item.name} 빠른 기록 변경`}
                  aria-haspopup="dialog"
                  onClick={() => setEditingSlot(index)}
                >
                  <Ellipsis size={17} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
          <li className="quick-slot">
            <button
              className="quick-food quick-food-manual"
              type="button"
              onClick={(event) => onManualEntry(event.currentTarget)}
              aria-haspopup="dialog"
            >
              <PenLine size={21} aria-hidden="true" />
              <span>직접 입력</span>
            </button>
          </li>
        </ol>
      </section>
      {editingSlot !== null && (
        <QuickFoodsDialog
          foods={foods}
          foodIds={slots.map((food) => food?.id ?? '')}
          slot={editingSlot}
          onClose={closeEditor}
          onSelect={saveSlot}
        />
      )}
    </div>
  )
}
