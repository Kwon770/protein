import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Flame, Pencil, Plus } from 'lucide-react'
import type { CatalogFood } from '../app/data'
import {
  historyDate,
  historyGoalStreak,
  historyOffset,
  historyPercent,
  historyTotals,
  historyWeekEnd,
} from '../app/history'
import { recordsForDate, type AppState, type FoodItem, type ProteinRecord } from '../app/model'
import { useLocalDay } from '../app/useLocalDay'
import { FoodEntryDialog } from '../components/FoodEntryDialog'
import { FoodIcon } from '../components/FoodIcon'
import { HistoryHeatmap } from '../components/HistoryHeatmap'
import { HistoryWeekCalendar } from '../components/HistoryWeekCalendar'
import './history.css'

interface HistoryScreenProps {
  state: AppState
  foods: readonly CatalogFood[]
  calendarHost: HTMLDivElement | null
  onUpdate: (id: string, item: FoodItem) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

const fullDate = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
const dateWithYear = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const recordTime = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })
const heatmapWeeks = 16
const heatmapDays = heatmapWeeks * 7

function calendarDate(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function HistoryScreen({ state, foods, calendarHost, onUpdate, onDelete, onAdd }: HistoryScreenProps) {
  const today = useLocalDay()
  const [chosenDate, setChosenDate] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProteinRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const editButtons = useRef(new Map<string, HTMLButtonElement>())
  const deleteOpener = useRef<HTMLButtonElement>(null)
  const selectedDate = chosenDate && chosenDate <= today ? chosenDate : today
  const selectedDay = calendarDate(selectedDate)
  const currentDay = calendarDate(today)
  const todayIsSelected = selectedDate === today
  const offset = historyOffset(today, selectedDate)
  const weekEnd = historyWeekEnd(offset)
  const totals = useMemo(() => historyTotals(state.records), [state.records])
  const goal = Math.max(1, state.goalG)
  const sundayOffset = (7 - currentDay.getDay()) % 7
  const heatmapEnd = sundayOffset - heatmapDays * Math.floor((sundayOffset - offset) / heatmapDays)
  let earliestOffset = offset
  for (const date of totals.keys()) {
    const recordOffset = historyOffset(today, date)
    if (recordOffset < earliestOffset) earliestOffset = recordOffset
  }
  const weekCount = heatmapWeeks * (Math.floor((sundayOffset - earliestOffset) / heatmapDays) + 1)
  const heatmap = Array.from({ length: heatmapDays }, (_, index) => {
    const dayOffset = heatmapEnd - heatmapDays + 1 + index
    const date = historyDate(today, dayOffset)
    return {
      date,
      label: dateWithYear.format(calendarDate(date)),
      percentage: ((totals.get(date) ?? 0) * 100) / goal,
      available: dayOffset <= 0,
    }
  })
  const selectedTotal = totals.get(selectedDate) ?? 0
  const selectedRecords = recordsForDate(state.records, selectedDate).sort((a, b) =>
    b.takenAt.localeCompare(a.takenAt),
  )
  const streak = historyGoalStreak(totals, today, goal)
  function foodForRecord(record: ProteinRecord) {
    return foods.find((item) => record.catalogId ? item.id === record.catalogId : item.name === record.label)
  }
  function closeEditor(restoreId: string | null = editing?.id ?? null) {
    setEditing(null)
    setConfirmDelete(false)
    requestAnimationFrame(() => {
      const target = restoreId ? editButtons.current.get(restoreId) : detailTitle.current
      target?.focus({ preventScroll: restoreId === editing?.id })
    })
  }
  function chooseDate(date: string) {
    setChosenDate(date >= today ? null : date)
  }
  function deleteRecord(record: ProteinRecord) {
    const index = selectedRecords.findIndex((item) => item.id === record.id)
    const neighbor = selectedRecords[index + 1] ?? selectedRecords[index - 1]
    onDelete(record.id)
    closeEditor(neighbor?.id ?? null)
  }

  return (
    <div className="history-screen">
      {calendarHost && createPortal(
        <section className="history-week" aria-label="7일 단백질 달성률">
          <div className="history-week-head">
            <h1 className="page-title history-title">섭취 기록</h1>
            <p className="history-streak">
              <Flame size={16} aria-hidden="true" />
              <span><strong>{streak}일</strong> 연속 달성</span>
            </p>
          </div>
          <HistoryWeekCalendar
            today={today}
            selectedDate={selectedDate}
            totals={totals}
            goal={goal}
            weekCount={weekCount}
            onSelect={chooseDate}
          />
        </section>,
        calendarHost,
      )}
      <div className="history-layout">
        <HistoryHeatmap days={heatmap} selectedDate={selectedDate} onSelect={chooseDate} />
        <section className="history-day" aria-labelledby="history-day-title">
          <header className="history-day-head">
            <div className="history-day-summary" aria-live="polite" aria-atomic="true">
              <h2 className="section-heading" id="history-day-title" ref={detailTitle} tabIndex={-1}>
                {(selectedDay.getFullYear() === currentDay.getFullYear() ? fullDate : dateWithYear).format(selectedDay)}
              </h2>
              <div className="history-day-total">
                <strong>{selectedTotal}</strong>
                <span>g</span>
                <small>목표 {goal}g · {historyPercent(selectedTotal, goal)}%</small>
              </div>
            </div>
            {todayIsSelected && selectedRecords.length > 0 && (
              <Button label="오늘 기록 추가" icon={<Plus size={16} />} variant="secondary" onClick={onAdd} />
            )}
            {weekEnd !== 0 && (
              <Button label="오늘로 이동" variant="ghost" onClick={() => chooseDate(today)} />
            )}
          </header>
          {selectedRecords.length > 0 ? (
            <ul className="history-entries">
              {selectedRecords.map((record) => (
                <li key={record.id}>
                  <FoodIcon className="history-food-icon" size={20} id={foodForRecord(record)?.id} iconId={record.iconId} />
                  <div className="history-food">
                    <strong>{record.label}</strong>
                    <small>
                      <time dateTime={record.takenAt}>
                        {recordTime.format(new Date(record.takenAt))}
                      </time>
                      {record.portion && ` · ${record.portion.amount}${record.portion.unit}`}
                      {record.estimated && ' · 추정'}
                    </small>
                  </div>
                  <b className="history-amount">
                    {record.proteinG} <small>g</small>
                  </b>
                  <button
                    ref={(button) => {
                      if (button) editButtons.current.set(record.id, button)
                      else editButtons.current.delete(record.id)
                    }}
                    type="button"
                    className="history-edit"
                    aria-label={`${record.label} 수정`}
                    onClick={() => setEditing(record)}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel history-empty">
              <h3>{todayIsSelected ? '오늘의 첫 기록을 남겨보세요' : '이날은 기록이 없어요'}</h3>
              {todayIsSelected && <Button label="음식 기록하기" variant="secondary" onClick={onAdd} />}
            </div>
          )}
        </section>
      </div>
      {editing && (
        <FoodEntryDialog
          profile={state.profileConfigured ? state.profile : undefined}
          key={editing.id}
          item={foodForRecord(editing)}
          record={editing}
          records={state.records}
          onClose={() => closeEditor()}
          onSave={(item) => {
            onUpdate(editing.id, item)
            closeEditor()
          }}
          onDelete={(event) => {
            deleteOpener.current = event.currentTarget
            setConfirmDelete(true)
          }}
        />
      )}
      {editing && confirmDelete && (
        <AlertDialog
          isOpen
          className="history-delete-alert"
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDelete(false)
              requestAnimationFrame(() => deleteOpener.current?.focus({ preventScroll: true }))
            }
          }}
          title="기록을 삭제할까요?"
          description={`${editing.label} ${editing.proteinG}g이 이 날짜의 섭취 기록에서 삭제돼요.`}
          cancelLabel="취소"
          actionLabel="삭제"
          onAction={() => deleteRecord(editing)}
        />
      )}
    </div>
  )
}
