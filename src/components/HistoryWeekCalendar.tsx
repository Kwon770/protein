import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { historyDate, historyOffset, historyPercent, historyWeekEnd } from '../app/history'
import './history-week-calendar.css'

type HistoryWeekCalendarProps = {
  today: string
  selectedDate: string
  totals: ReadonlyMap<string, number>
  goal: number
  weekCount: number
  onSelect: (date: string) => void
}

type MouseDrag = { id: number; x: number; y: number; left: number; moved: boolean }

const daysPerWeek = 7
const weekDay = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })
const fullDate = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
})

function pageWidth(scroller: HTMLDivElement) {
  return scroller.firstElementChild?.getBoundingClientRect().width ?? 0
}

function alignToPage(scroller: HTMLDivElement, page: number) {
  const left = page * pageWidth(scroller)
  if (Math.abs(scroller.scrollLeft - left) > 1) scroller.scrollLeft = left
}

export function HistoryWeekCalendar({
  today, selectedDate, totals, goal, weekCount, onSelect,
}: HistoryWeekCalendarProps) {
  const selectedOffset = historyOffset(today, selectedDate)
  const selectedWeekEnd = historyWeekEnd(selectedOffset)
  const selectedPage = weekCount - 1 + selectedWeekEnd / daysPerWeek
  const scrollerRef = useRef<HTMLDivElement>(null)
  const latestPage = useRef(selectedPage)
  const settleTimer = useRef<number | undefined>(undefined)
  const requestedFocus = useRef<string | null>(null)
  const drag = useRef<MouseDrag | null>(null)
  const suppressClick = useRef(false)

  useLayoutEffect(() => {
    latestPage.current = selectedPage
    window.clearTimeout(settleTimer.current)
    const scroller = scrollerRef.current
    if (!scroller) return

    alignToPage(scroller, selectedPage)
    const shouldFocus = requestedFocus.current === selectedDate
    requestedFocus.current = null
    if (shouldFocus) {
      scroller.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true })
    }
  }, [selectedDate, selectedPage, today, weekCount])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new ResizeObserver(() => alignToPage(scroller, latestPage.current))
    observer.observe(scroller)
    return () => {
      window.clearTimeout(settleTimer.current)
      observer.disconnect()
    }
  }, [])

  function settleScroll() {
    window.clearTimeout(settleTimer.current)
    const scroller = scrollerRef.current
    if (!scroller || drag.current?.moved) return

    const width = pageWidth(scroller)
    if (!width) return

    const page = Math.max(0, Math.min(weekCount - 1, Math.round(scroller.scrollLeft / width)))
    if (page === selectedPage || Math.abs(scroller.scrollLeft - page * width) > 2) return

    const offset = (page - weekCount + 1) * daysPerWeek + selectedOffset - selectedWeekEnd
    const date = historyDate(today, offset)
    if (scroller.contains(document.activeElement)) requestedFocus.current = date
    onSelect(date)
  }

  function scheduleSettle() {
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(settleScroll, 140)
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, offset: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    let next: number
    switch (event.key) {
      case 'ArrowLeft': next = offset - 1; break
      case 'ArrowRight': next = offset + 1; break
      case 'PageUp': next = offset - daysPerWeek; break
      case 'PageDown': next = offset + daysPerWeek; break
      case 'Home': next = -weekCount * daysPerWeek + 1; break
      case 'End': next = 0; break
      default: return
    }
    event.preventDefault()
    const date = historyDate(today, Math.min(0, Math.max(next, -weekCount * daysPerWeek + 1)))
    if (date !== selectedDate) {
      requestedFocus.current = date
      onSelect(date)
    }
  }

  function startMouseDrag(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      left: event.currentTarget.scrollLeft, moved: false,
    }
  }

  function moveMouseDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (active?.id !== event.pointerId) return

    const x = event.clientX - active.x
    const scroller = event.currentTarget
    if (!active.moved) {
      if (Math.abs(x) < 6 || Math.abs(x) <= Math.abs(event.clientY - active.y)) return
      active.moved = true
      suppressClick.current = true
      scroller.setPointerCapture(event.pointerId)
      scroller.dataset.mouseDrag = ''
    }
    scroller.scrollLeft = active.left - x
  }

  function endMouseDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (active?.id !== event.pointerId) return

    drag.current = null
    if (!active.moved) return

    const scroller = event.currentTarget
    const width = pageWidth(scroller)
    const left = scroller.scrollLeft
    delete scroller.dataset.mouseDrag
    if (!width) return

    const origin = Math.round(active.left / width)
    let page = Math.round(left / width)
    const displacement = left - active.left
    if (page === origin && Math.abs(displacement) >= Math.min(48, width * .2)) {
      page += Math.sign(displacement)
    }
    scroller.scrollTo({
      left: Math.max(0, Math.min(weekCount - 1, page)) * width,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    scheduleSettle()
  }

  return (
    <div
      className="history-week-scroll"
      ref={scrollerRef}
      role="group"
      aria-label="주간 날짜 선택"
      aria-description="좌우로 스크롤해 주간 기록을 탐색하거나 방향키로 날짜를 이동할 수 있어요."
      onScroll={scheduleSettle}
      onScrollEnd={settleScroll}
      onPointerDown={startMouseDrag}
      onPointerMove={moveMouseDrag}
      onPointerUp={endMouseDrag}
      onPointerCancel={endMouseDrag}
      onLostPointerCapture={endMouseDrag}
      onPointerLeave={() => { if (!drag.current?.moved) drag.current = null }}
      onClickCapture={(event) => {
        if (suppressClick.current && event.detail > 0) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      {Array.from({ length: weekCount }, (_, page) => {
        const end = (page - weekCount + 1) * daysPerWeek
        return (
          <div className="history-week-days" key={historyDate(today, end)}>
            {Array.from({ length: daysPerWeek }, (_, index) => {
              const offset = end - daysPerWeek + 1 + index
              const key = historyDate(today, offset)
              const date = new Date(`${key}T12:00:00`)
              const total = totals.get(key) ?? 0
              const fill = Math.min(100, (total / goal) * 100)
              const selected = key === selectedDate
              return (
                <button
                  type="button"
                  className="history-date"
                  tabIndex={selected ? 0 : -1}
                  key={key}
                  aria-current={key === today ? 'date' : undefined}
                  aria-pressed={selected}
                  aria-label={`${fullDate.format(date)}, ${total}g, 목표 ${historyPercent(total, goal)}%`}
                  onClick={() => onSelect(key)}
                  onKeyDown={(event) => moveWithKeyboard(event, offset)}
                >
                  <span className="history-weekday" aria-hidden="true">{weekDay.format(date)}</span>
                  <span className="history-date-ring" aria-hidden="true">
                    <svg viewBox="0 0 48 48" focusable="false">
                      <circle className="history-ring-track" cx="24" cy="24" r="21" />
                      {fill > 0 && (
                        <circle
                          className="history-ring-progress"
                          cx="24" cy="24" r="21" pathLength="100"
                          strokeDasharray={`${fill} 100`} transform="rotate(-90 24 24)"
                        />
                      )}
                    </svg>
                    <b>{date.getDate()}</b>
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
