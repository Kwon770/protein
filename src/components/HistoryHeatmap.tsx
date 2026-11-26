import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import './history-heatmap.css'

type HeatmapDay = {
  date: string
  label: string
  percentage: number
  available: boolean
}

const daysPerWeek = 7
const arrowSteps = new Map([
  ['ArrowUp', -1],
  ['ArrowDown', 1],
  ['ArrowLeft', -daysPerWeek],
  ['ArrowRight', daysPerWeek],
])

function achievementLevel(percentage: number) {
  if (percentage >= 100) return 4
  if (percentage >= 75) return 3
  if (percentage >= 40) return 2
  return percentage > 0 ? 1 : 0
}

function achievementLabel(percentage: number) {
  return percentage > 0 && percentage < 1
    ? '목표 1% 미만'
    : `목표 ${Math.floor(percentage)}% 달성`
}

function heatmapMonths(days: readonly HeatmapDay[]) {
  const months: { key: string; column: number }[] = []
  for (const [index, day] of days.entries()) {
    if (!day.available) continue

    const key = day.date.slice(0, 7)
    const previous = months.at(-1)
    if (key === previous?.key) continue

    const column = Math.floor(index / daysPerWeek)
    // Prefer the month boundary to the label for a short leading partial month.
    if (previous && column - previous.column < 2) months.pop()
    months.push({ key, column })
  }
  return months
}

export function HistoryHeatmap({
  days,
  selectedDate,
  onSelect,
}: {
  days: readonly HeatmapDay[]
  selectedDate: string
  onSelect: (date: string) => void
}) {
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const columns = Math.max(1, Math.ceil(days.length / daysPerWeek))
  const months = heatmapMonths(days)
  const firstAvailable = days.findIndex((day) => day.available)
  let lastAvailable = days.length - 1
  while (lastAvailable >= 0 && !days[lastAvailable].available) lastAvailable -= 1
  const currentIndex = days.findIndex((day) => day.available && day.date === (focusedDate ?? selectedDate))
  const tabStop = currentIndex < 0 ? lastAvailable : currentIndex

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const step = arrowSteps.get(event.key)
    const row = index % daysPerWeek
    let next = index

    if (event.key === 'Home') {
      next = firstAvailable
    } else if (event.key === 'End') {
      next = lastAvailable
    } else if (step !== undefined) {
      next += step
      if ((step === -1 && row === 0) || (step === 1 && row === daysPerWeek - 1)) next = index
    } else {
      return
    }

    event.preventDefault()
    if (next !== index) buttons.current.get(next)?.focus()
  }

  return (
    <div className="panel history-heatmap" style={{ '--heatmap-columns': columns } as CSSProperties}>
      {months.length > 0 && (
        <div className="history-heatmap-months" aria-hidden="true">
          {months.map(({ key, column }) => (
            <span
              className="history-heatmap-month"
              key={key}
              style={{ gridColumnStart: column + 1 }}
              data-edge={column === columns - 1 || undefined}
            >
              {Number(key.slice(5))}월
            </span>
          ))}
        </div>
      )}
      <div
        className="history-heatmap-grid"
        role="group"
        aria-label="날짜별 단백질 목표 달성률"
        aria-description="방향키로 날짜를 이동하고 Enter로 선택할 수 있어요."
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocusedDate(null)
        }}
      >
        {days.map((day, index) =>
          day.available ? (
            <button
              type="button"
              className="history-heatmap-cell"
              key={day.date}
              ref={(button) => {
                if (button) buttons.current.set(index, button)
                else buttons.current.delete(index)
              }}
              tabIndex={index === tabStop ? 0 : -1}
              aria-label={`${day.label} · ${achievementLabel(day.percentage)}`}
              aria-pressed={day.date === selectedDate}
              onFocus={() => setFocusedDate(day.date)}
              onKeyDown={(event) => moveFocus(event, index)}
              onClick={() => onSelect(day.date)}
            >
              <span className="history-heatmap-mark" data-level={achievementLevel(day.percentage)} aria-hidden="true" />
            </button>
          ) : <span key={day.date} aria-hidden="true" />,
        )}
      </div>
    </div>
  )
}
