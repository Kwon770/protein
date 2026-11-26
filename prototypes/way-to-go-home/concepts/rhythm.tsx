import { useState, type CSSProperties, type FormEvent } from 'react'
import { formatGrams, quickFoods, type HomeProps } from '../model'
import { AddButton, EntryList, Icon } from '../ui'
import './rhythm.css'

export function NightHome({
  entries,
  total,
  target,
  percent,
  remaining,
  onQuick,
  onAdd,
  onEdit,
  onShare,
}: HomeProps) {
  const suggested = remaining <= 12 ? quickFoods[2] : quickFoods[0]
  return (
    <div className="rhythm-night">
      <header className="nt-head">
        <Icon name="moon" size={18} />
        <span>단백하게</span>
        <small>하루 마무리</small>
      </header>
      <section className="nt-hero">
        <span className="nt-moon" aria-hidden="true" />
        <span className="nt-star nt-star-one" aria-hidden="true">
          ✦
        </span>
        <span className="nt-star nt-star-two" aria-hidden="true">
          ✧
        </span>
        <h2>
          오늘의
          <br />
          저녁 체크인
        </h2>
        <p>{entries.length ? '오늘 챙긴 단백질을 확인해요.' : '아직 기록하지 않은 끼니가 있나요?'}</p>
      </section>
      <section className="nt-check">
        <div className="nt-stats">
          <div>
            <small>오늘 기록한 단백질</small>
            <strong>
              {total}
              <em>g</em>
            </strong>
          </div>
          <div>
            <small>목표 {target}g</small>
            <b>{remaining ? `${remaining}g 남음` : '목표 달성'}</b>
          </div>
        </div>
        <div className="nt-bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        {remaining > 0 ? (
          <button type="button" className="nt-suggest" onClick={() => onQuick(suggested)}>
            <Icon name={suggested.icon} />
            <span>
              <small>먹었다면 바로 추가</small>
              <strong>{suggested.name}</strong>
            </span>
            <b>+{suggested.grams}g</b>
          </button>
        ) : (
          <button type="button" className="nt-suggest" onClick={onShare}>
            <Icon name="share" />
            <span>
              <small>오늘 몫은 채웠어요.</small>
              <strong>달성 카드 만들기</strong>
            </span>
            <Icon name="chevron-right" size={15} />
          </button>
        )}
        <AddButton onClick={() => onAdd('estimate')} label="끼니 기록하기" />
      </section>
      <section className="nt-entries">
        <h3>오늘 기록</h3>
        <EntryList entries={entries} onEdit={onEdit} />
      </section>
    </div>
  )
}

const sampleWeek = [
  { label: '월', date: '16일', grams: 120 },
  { label: '화', date: '17일', grams: 104 },
  { label: '수', date: '18일', grams: 132 },
  { label: '목', date: '19일', grams: 0 },
  { label: '금', date: '20일', grams: 122 },
  { label: '토', date: '21일', grams: 126 },
  { label: '오늘', date: '22일', grams: 0 },
]

export function WeekHome({ entries, total, target, percent, remaining, onAdd, onEdit }: HomeProps) {
  const [openedDay, setOpenedDay] = useState(6)
  const days = sampleWeek.map((day, index) => (index === 6 ? { ...day, grams: total } : day))
  const selected = days[openedDay]
  const reached = days.filter((day) => day.grams >= target).length
  return (
    <div className="rhythm-week">
      <header className="wk-head">
        <Icon name="calendar" />
        <span>단백하게</span>
        <small>11월 16일–22일</small>
      </header>
      <section className="wk-week">
        <h2>
          일주일의
          <br />
          리듬
        </h2>
        <p>
          7일 중 <strong>{reached}일</strong> 달성
        </p>
        <div className="wk-days" aria-label="날짜별 기록">
          {days.map((day, index) => (
            <button
              type="button"
              key={day.date}
              aria-pressed={openedDay === index}
              aria-label={`${day.date} ${day.label}, ${day.grams}g`}
              onClick={() => setOpenedDay(index)}
            >
              <span className="wk-column">
                <span
                  className="wk-fill"
                  style={{ height: `${Math.min((day.grams / target) * 100, 100)}%` }}
                />
                {day.grams >= target && <Icon name="check" size={13} />}
              </span>
              <small>{day.label}</small>
            </button>
          ))}
        </div>
        <div className="wk-day-copy" aria-live="polite">
          <strong>
            {selected.date} {selected.label === '오늘' ? '오늘' : `${selected.label}요일`}
          </strong>
          <span>{selected.grams ? `${selected.grams}g 기록` : '기록 없음'}</span>
        </div>
      </section>
      <section className="wk-today">
        <div>
          <h3>오늘 단백질</h3>
          <strong>
            {total}
            <small> / {target}g</small>
          </strong>
        </div>
        <b>{remaining ? `${remaining}g 남음` : '목표 달성'}</b>
        <div className="wk-today-bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      </section>
      <AddButton onClick={() => onAdd()} />
      <section className="wk-entries">
        <h3>오늘 기록</h3>
        <EntryList entries={entries} onEdit={onEdit} />
      </section>
    </div>
  )
}

export function CounterHome({
  entries,
  total,
  target,
  percent,
  remaining,
  onQuick,
  onAdd,
  onEdit,
}: HomeProps) {
  const [value, setValue] = useState('15')
  const amount = Number(value)
  const valid = amount > 0 && amount <= 300 && Number.isFinite(amount)
  function adjust(delta: number) {
    setValue((previous) => formatGrams(Math.min(300, Math.max(0, Number(previous || 0) + delta))))
  }
  function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (valid) onQuick({ name: '직접 기록', grams: amount, icon: 'plus' })
  }
  return (
    <div className="rhythm-counter">
      <header className="ct-head">
        <span>단백하게</span>
        <span>단백질 계수기</span>
      </header>
      <section className="ct-display" aria-label="오늘 기록한 단백질">
        <div>
          <small>오늘 기록한 단백질</small>
          <h2>
            {total}
            <em>g</em>
          </h2>
        </div>
        <dl>
          <div>
            <dt>목표</dt>
            <dd>{target}g</dd>
          </div>
          <div>
            <dt>남음</dt>
            <dd>{remaining}g</dd>
          </div>
        </dl>
        <div
          className="ct-bar"
          aria-hidden="true"
          style={{ '--ct-progress': `${percent}%` } as CSSProperties}
        />
      </section>
      <form className="ct-controls" onSubmit={record}>
        <label htmlFor="counter-grams">기록할 단백질</label>
        <div className="ct-input-line">
          <button type="button" aria-label="5g 빼기" onClick={() => adjust(-5)}>
            <Icon name="minus" />
          </button>
          <div>
            <input
              id="counter-grams"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              type="number"
              inputMode="decimal"
              min="0.1"
              max="300"
              step="0.1"
            />
            <span>g</span>
          </div>
          <button type="button" aria-label="5g 더하기" onClick={() => adjust(5)}>
            <Icon name="plus" />
          </button>
        </div>
        <div className="ct-presets" aria-label="기록량 빠른 선택">
          {[10, 20, 30].map((grams) => (
            <button
              type="button"
              aria-pressed={amount === grams}
              key={grams}
              onClick={() => setValue(String(grams))}
            >
              {grams}g
            </button>
          ))}
        </div>
        <button type="submit" disabled={!valid} className="p-add">
          {valid ? `${formatGrams(amount)}g 기록하기` : '기록할 양을 입력하세요'}
        </button>
      </form>
      <button type="button" className="ct-other" onClick={() => onAdd('quick')}>
        음식으로 기록 <Icon name="chevron-right" size={14} />
      </button>
      <section className="ct-entries">
        <h3>오늘 기록</h3>
        <EntryList entries={entries} onEdit={onEdit} />
      </section>
    </div>
  )
}
