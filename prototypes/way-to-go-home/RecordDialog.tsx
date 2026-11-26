import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { formatGrams, mealTypes, quickFoods, type Entry, type Food, type Mode } from './model'
import { Icon } from './ui'

export function StudioDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`studio-dialog${wide ? ' studio-dialog-wide' : ''}`}
      aria-labelledby="studio-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div className="studio-dialog-interior">
        <header className="studio-dialog-header">
          <h2 id="studio-dialog-title">{title}</h2>
          <button className="studio-icon-button" type="button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

const modes: { id: Mode; name: string }[] = [
  { id: 'quick', name: '빠른 기록' },
  { id: 'estimate', name: '끼니 추정' },
  { id: 'direct', name: '직접 입력' },
]
const portions = ['적게', '보통', '많이']

export function RecordDialog({
  initialMode,
  entry,
  onClose,
  onRecord,
  onUpdate,
  onRemove,
}: {
  initialMode: Mode
  entry?: Entry
  onClose: () => void
  onRecord: (food: Food, options?: { estimated?: boolean; note?: string }) => void
  onUpdate: (entry: Entry) => void
  onRemove: (entry: Entry) => void
}) {
  const [mode, setMode] = useState(initialMode)
  const [meal, setMeal] = useState(2)
  const [portion, setPortion] = useState(1)
  const [grams, setGrams] = useState(entry ? String(entry.grams) : '')
  const [name, setName] = useState(entry?.name ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const estimate = mealTypes[meal].grams[portion]

  function submitDirect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(formatGrams(Number(grams)))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 300) return
    const food: Food = { name: name.trim() || '직접 기록', grams: amount, icon: entry?.icon ?? 'plus' }
    if (entry)
      onUpdate({
        ...entry,
        ...food,
        estimated: entry.estimated && amount === entry.grams,
        note: note.trim() || undefined,
      })
    else onRecord(food, { note: note.trim() || undefined })
  }

  return (
    <StudioDialog title={entry ? '기록 수정' : '단백질 기록하기'} onClose={onClose}>
      {!entry && (
        <div className="studio-record-tabs" aria-label="기록 방식">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
      {!entry && mode === 'quick' && (
        <div className="studio-quick-options">
          {quickFoods.map((food) => (
            <button key={food.name} type="button" onClick={() => onRecord(food)}>
              <Icon name={food.icon} />
              <span>{food.name}</span>
              <strong>+{food.grams}g</strong>
            </button>
          ))}
        </div>
      )}
      {!entry && mode === 'estimate' && (
        <div className="studio-estimate">
          <div className="studio-meal-options" aria-label="끼니 유형">
            {mealTypes.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={meal === index}
                onClick={() => setMeal(index)}
              >
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
          <div className="studio-record-tabs" aria-label="끼니 분량">
            {portions.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-pressed={portion === index}
                onClick={() => setPortion(index)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="studio-strong-button"
            type="button"
            onClick={() =>
              onRecord(
                { name: mealTypes[meal].name, grams: estimate, icon: 'meal' },
                { estimated: true },
              )
            }
          >
            약 {estimate}g 기록하기
          </button>
        </div>
      )}
      {(entry || mode === 'direct') && (
        <form className="studio-record-form" onSubmit={submitDirect}>
          <label>
            음식 이름 <small>선택</small>
            <input
              type="text"
              maxLength={45}
              placeholder="예: 두부 반 모"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            단백질 양 (g)
            <input
              type="number"
              min="0.1"
              max="300"
              step="0.1"
              required
              inputMode="decimal"
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
              placeholder="예: 12"
            />
          </label>
          <label>
            메모 <small>선택</small>
            <textarea maxLength={150} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button type="submit" className="studio-strong-button">
            {entry ? '변경사항 저장' : '기록하기'}
          </button>
          {entry && (
            <button
              type="button"
              className="studio-text-button studio-delete"
              onClick={() => (confirmDelete ? onRemove(entry) : setConfirmDelete(true))}
            >
              <Icon name="trash" size={16} />
              {confirmDelete ? '이 기록 삭제하기' : '삭제'}
            </button>
          )}
        </form>
      )}
    </StudioDialog>
  )
}

export function ShareDialog({
  total,
  target,
  onClose,
}: {
  total: number
  target: number
  onClose: () => void
}) {
  const [showGrams, setShowGrams] = useState(false)
  const [status, setStatus] = useState('')
  const achievement = `${Math.round((total / target) * 100)}%`
  const number = showGrams ? `${formatGrams(total)} / ${target}g` : achievement
  const [date] = useState(() =>
    new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(Date.now()),
  )
  function saveCard() {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setStatus('이미지를 만들지 못했어요.')
      return
    }
    ctx.fillStyle = '#f1bb99'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#392845'
    ctx.lineWidth = 6
    ctx.strokeRect(72, 72, 936, 1776)
    ctx.fillStyle = '#392845'
    ctx.textAlign = 'center'
    ctx.font = '800 46px system-ui'
    ctx.fillText('단백하게', 540, 240)
    ctx.font = '800 200px system-ui'
    ctx.fillText('✦', 540, 650)
    ctx.font = '800 76px system-ui'
    ctx.fillText('오늘 단백질 목표 달성', 540, 865)
    ctx.font = `850 ${showGrams ? 132 : 230}px system-ui`
    ctx.fillText(number, 540, 1200)
    ctx.font = '600 48px system-ui'
    ctx.fillText(date, 540, 1600)
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('이미지를 만들지 못했어요.')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'way-to-go-achievement.png'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('달성 카드 다운로드를 시작했어요.')
    })
  }
  return (
    <StudioDialog title="달성 카드" onClose={onClose}>
      <div className="studio-share-card">
        <span>단백하게</span>
        <Icon name="sparkle" size={43} />
        <h3>오늘 단백질 목표 달성</h3>
        <strong>{number}</strong>
        <small>{date}</small>
      </div>
      <label className="studio-share-toggle">
        <input
          type="checkbox"
          checked={showGrams}
          onChange={(event) => setShowGrams(event.target.checked)}
        />
        기록량과 목표를 g으로 표시
      </label>
      <button className="studio-strong-button" type="button" onClick={saveCard}>
        <Icon name="download" size={18} />
        이미지 다운로드
      </button>
      {status && (
        <p role="status" className="studio-share-status">
          {status}
        </p>
      )}
    </StudioDialog>
  )
}
