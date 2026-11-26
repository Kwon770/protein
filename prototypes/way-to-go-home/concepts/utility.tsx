import type { CSSProperties } from 'react'
import { formatGrams, quickFoods, type Entry, type Food, type HomeProps } from '../model'
import { Icon } from '../ui'
import './utility.css'

function RecordButton({ entry, onEdit }: { entry: Entry; onEdit: HomeProps['onEdit'] }) {
  return (
    <button
      type="button"
      className="utility-record"
      aria-label={`${entry.name} 단백질 ${formatGrams(entry.grams)}g 기록 수정`}
      onClick={() => onEdit(entry)}
    >
      <span className="utility-record-icon">
        <Icon name={entry.icon} size={16} />
      </span>
      <span className="utility-record-name">
        <b>{entry.name}</b>
        <small>
          {entry.time}
          {entry.estimated && ' · 추정'}
        </small>
      </span>
      <strong>
        {formatGrams(entry.grams)}
        <small>g</small>
      </strong>
      <span aria-hidden="true" className="utility-record-arrow">
        ›
      </span>
    </button>
  )
}

function UtilityLog({ entries, onEdit }: Pick<HomeProps, 'entries' | 'onEdit'>) {
  return (
    <section className="utility-log" aria-label="오늘 기록">
      <div className="utility-log-head">
        <h2>오늘 기록</h2>
        <span>{entries.length}건</span>
      </div>
      {entries.length ? (
        [...entries]
          .reverse()
          .map((entry) => <RecordButton key={entry.id} entry={entry} onEdit={onEdit} />)
      ) : (
        <p className="utility-empty">첫 기록을 추가해 보세요.</p>
      )}
    </section>
  )
}

function UtilityAction({
  label,
  onClick,
  icon = '+',
}: {
  label: string
  onClick: () => void
  icon?: string
}) {
  return (
    <button type="button" className="utility-action" onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

function Remaining({ remaining }: { remaining: number }) {
  return remaining > 0 ? (
    <>
      <b>{formatGrams(remaining)}g</b> 남았어요
    </>
  ) : (
    <b>오늘 목표 달성</b>
  )
}

function ProgressRule({ percent }: { percent: number }) {
  return (
    <div className="utility-progress-rule" aria-hidden="true">
      <i style={{ width: `${percent}%` }} />
    </div>
  )
}

export function Focus(home: HomeProps) {
  const ringStyle = {
    '--utility-progress': `${home.percent}%`,
    '--utility-angle': `${home.percent * 3.6}deg`,
  } as CSSProperties

  return (
    <div className="utility-home utility-focus">
      <header className="utility-focus-header">
        <h1>오늘의 단백질</h1>
        <span>단백하게</span>
      </header>
      <section className="utility-focus-hero" aria-label="오늘의 단백질 목표">
        <div className="utility-focus-ring" style={ringStyle}>
          <div className="utility-ring-meter" aria-hidden="true" />
          {home.percent > 0 && <i className="utility-ring-tip" aria-hidden="true" />}
          <div className="utility-focus-value">
            <span>기록한 단백질</span>
            <strong data-compact={formatGrams(home.total).length > 4}>
              {formatGrams(home.total)}
              <small>g</small>
            </strong>
            <span>목표 {formatGrams(home.target)}g</span>
          </div>
        </div>
        <p className="utility-focus-remaining">
          <Remaining remaining={home.remaining} />
        </p>
      </section>
      <UtilityAction label="단백질 기록하기" onClick={() => home.onAdd()} />
      <UtilityLog entries={home.entries} onEdit={home.onEdit} />
    </div>
  )
}

export function Split(home: HomeProps) {
  return (
    <div className="utility-home utility-split">
      <header className="utility-split-header">
        <b>
          단백하게<span>.</span>
        </b>
      </header>
      <h1>
        오늘의
        <br />
        단백질
      </h1>
      <section className="utility-split-metrics" aria-label="오늘의 단백질 목표">
        <div className="utility-split-total">
          <span>기록한 양</span>
          <strong data-compact={formatGrams(home.total).length > 4}>
            {formatGrams(home.total)}
            <small>g</small>
          </strong>
          <span>목표 {formatGrams(home.target)}g</span>
        </div>
        <div className="utility-split-progress">
          <span>{home.remaining ? '남은 양' : '오늘 목표'}</span>
          <strong>
            {home.remaining ? (
              <>
                {formatGrams(home.remaining)}
                <small>g</small>
              </>
            ) : (
              '달성'
            )}
          </strong>
          <ProgressRule percent={home.percent} />
        </div>
      </section>
      <UtilityAction label="단백질 기록하기" icon="↗" onClick={() => home.onAdd()} />
      <UtilityLog entries={home.entries} onEdit={home.onEdit} />
    </div>
  )
}

function FoodArt({ food }: { food: Food }) {
  return (
    <span className={`utility-food-art utility-art-${food.icon}`} aria-hidden="true">
      <Icon name={food.icon} size={29} />
    </span>
  )
}

export function Quick(home: HomeProps) {
  const presets = quickFoods.slice(0, 4)

  return (
    <div className="utility-home utility-quick">
      <section className="utility-quick-summary" aria-label="오늘의 단백질 목표">
        <h1>오늘의 단백질</h1>
        <div className="utility-quick-totals">
          <strong data-compact={formatGrams(home.total).length > 4}>
            {formatGrams(home.total)}
            <small>g</small>
          </strong>
          <span>목표 {formatGrams(home.target)}g</span>
        </div>
        <ProgressRule percent={home.percent} />
        <p>
          <Remaining remaining={home.remaining} />
        </p>
      </section>
      <section className="utility-quick-tray" aria-label="빠른 기록">
        <h2>빠른 기록</h2>
        <div className="utility-quick-grid">
          {presets.map((food) => (
            <button
              type="button"
              key={food.name}
              className="utility-preset"
              aria-label={`${food.name} 단백질 ${formatGrams(food.grams)}g 빠른 기록`}
              onClick={() => home.onQuick(food)}
            >
              <FoodArt food={food} />
              <span className="utility-preset-copy">
                <b>{food.name}</b>
                <small>+{formatGrams(food.grams)}g</small>
              </span>
              <span className="utility-preset-plus" aria-hidden="true">
                +
              </span>
            </button>
          ))}
        </div>
        <div className="utility-quick-other">
          <button type="button" onClick={() => home.onAdd('estimate')}>
            식사 추정 <span aria-hidden="true">↗</span>
          </button>
          <button type="button" onClick={() => home.onAdd('direct')}>
            직접 입력 <span aria-hidden="true">↗</span>
          </button>
        </div>
        <UtilityLog entries={home.entries} onEdit={home.onEdit} />
      </section>
    </div>
  )
}

const mealPeriods = [
  { name: '아침', before: 11, appearance: 'morning' },
  { name: '점심', before: 16, appearance: 'day' },
  { name: '저녁', before: 24, appearance: 'evening' },
]

function mealHour(time: string) {
  const hour = Number(time.match(/(\d{1,2}):/)?.[1])
  if (time.includes('오후')) return (hour % 12) + 12
  if (time.includes('오전')) return hour % 12
  return hour
}

export function Meals(home: HomeProps) {
  return (
    <div className="utility-home utility-meals">
      <header className="utility-meals-header">
        <h1>오늘의 식사</h1>
        <span>단백하게</span>
      </header>
      <section className="utility-meals-overview" aria-label="오늘의 단백질 목표">
        <div>
          <span>기록한 단백질</span>
          <div className="utility-meals-amount">
            <strong>{formatGrams(home.total)}g</strong>
            <span> / {formatGrams(home.target)}g</span>
          </div>
        </div>
        <p>
          <Remaining remaining={home.remaining} />
        </p>
        <ProgressRule percent={home.percent} />
      </section>
      <div className="utility-meal-timeline">
        {mealPeriods.map((period, index) => {
          const after = mealPeriods[index - 1]?.before ?? 0
          const records = home.entries.filter((entry) => {
            const hour = mealHour(entry.time)
            return (hour >= after && hour < period.before) || (Number.isNaN(hour) && index === 2)
          })
          const total = records.reduce((sum, entry) => sum + entry.grams, 0)
          return (
            <section
              className={`utility-meal-period utility-${period.appearance}`}
              key={period.appearance}
            >
              <i className="utility-meal-sun" aria-hidden="true" />
              <div className="utility-meal-block">
                <div className="utility-meal-head">
                  <h2>{period.name}</h2>
                  {records.length > 0 && <b>{formatGrams(total)}g</b>}
                </div>
                {records.length ? (
                  records.map((entry) => (
                    <RecordButton key={entry.id} entry={entry} onEdit={home.onEdit} />
                  ))
                ) : (
                  <p className="utility-empty">기록 없음</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
      <UtilityAction label="먹은 식사 기록하기" onClick={() => home.onAdd('estimate')} />
    </div>
  )
}

function getSuggestedFoods(remaining: number) {
  const combinations = quickFoods.flatMap((food, index) => [
    [food],
    ...quickFoods.slice(index + 1).map((other) => [food, other]),
  ])
  const distance = (foods: Food[]) =>
    Math.abs(remaining - foods.reduce((sum, food) => sum + food.grams, 0))
  return combinations.sort((a, b) => distance(a) - distance(b) || a.length - b.length)[0] ?? []
}

export function Coach(home: HomeProps) {
  const foods = getSuggestedFoods(home.remaining)
  const combinedGrams = foods.reduce((sum, food) => sum + food.grams, 0)
  const done = home.remaining === 0

  return (
    <div className="utility-home utility-coach">
      <header className="utility-coach-header">
        <b>오늘의 단백질</b>
        <span>
          {formatGrams(home.total)} / {formatGrams(home.target)}g
        </span>
      </header>
      <section className="utility-coach-hero" aria-label="오늘의 남은 단백질">
        <div className="utility-coach-halo" aria-hidden="true">
          ✳
        </div>
        <h1>
          {done ? (
            <>
              오늘 몫은
              <br />다 채웠어요
            </>
          ) : (
            <>
              오늘 <strong>{formatGrams(home.remaining)}g</strong>
              <br />
              남았어요
            </>
          )}
        </h1>
        <ProgressRule percent={home.percent} />
      </section>
      {done ? (
        <UtilityAction label="달성 카드 보기" icon="↗" onClick={home.onShare} />
      ) : (
        <section className="utility-coach-picks" aria-label="다음 음식 제안">
          <div className="utility-coach-picks-head">
            <h2>{foods.length > 1 ? '다음엔 이 조합 어때요?' : '다음엔 이 음식 어때요?'}</h2>
            <span>합계 {formatGrams(combinedGrams)}g</span>
          </div>
          <div className="utility-coach-foods" data-count={foods.length}>
            {foods.map((food) => (
              <button
                type="button"
                className="utility-coach-food"
                key={food.name}
                aria-label={`${food.name} 단백질 ${formatGrams(food.grams)}g 빠른 기록`}
                onClick={() => home.onQuick(food)}
              >
                <FoodArt food={food} />
                <b>{food.name}</b>
                <span>
                  <span aria-hidden="true">+</span> {formatGrams(food.grams)}g 기록
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <button type="button" className="utility-coach-more" onClick={() => home.onAdd()}>
        다른 음식 기록 <span aria-hidden="true">↗</span>
      </button>
      <UtilityLog entries={home.entries} onEdit={home.onEdit} />
    </div>
  )
}
