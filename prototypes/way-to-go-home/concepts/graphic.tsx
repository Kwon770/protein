import type { CSSProperties, ReactNode } from 'react'
import { formatGrams, quickFoods, type HomeProps } from '../model'
import { Icon } from '../ui'
import './graphic.css'

function grams(value: number) {
  return `${formatGrams(value)} g`
}

function remainingLabel(remaining: number) {
  return remaining > 0 ? `${grams(remaining)} 남음` : '오늘 목표 달성'
}

function fillValue(percent: number) {
  return Math.max(0, Math.min(100, percent))
}

function GraphicAdd({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="gh-add" type="button" onClick={onClick}>
      <Icon name="plus" size={19} />
      {children}
    </button>
  )
}

function GraphicQuick({ onQuick }: Pick<HomeProps, 'onQuick'>) {
  return (
    <div className="gh-quick" role="group" aria-label="빠른 기록">
      {quickFoods.slice(0, 2).map((food) => (
        <button type="button" key={food.name} onClick={() => onQuick(food)}>
          <Icon name={food.icon} size={16} />
          <span>{food.name}</span>
          <strong>+{grams(food.grams)}</strong>
        </button>
      ))}
    </div>
  )
}

function GraphicEntries({ entries, onEdit }: Pick<HomeProps, 'entries' | 'onEdit'>) {
  return (
    <section className="gh-entries" aria-label="오늘 기록">
      <div className="gh-entries-title">
        <h3>오늘 기록</h3>
        <span>{entries.length}건</span>
      </div>
      {entries.length ? (
        <ul>
          {[...entries].reverse().map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => onEdit(entry)}>
                <span className="gh-entry-icon">
                  <Icon name={entry.icon} size={16} />
                </span>
                <span className="gh-entry-name">
                  <strong>{entry.name}</strong>
                  <small>
                    {entry.time}
                    {entry.estimated ? ' · 추정' : ''}
                  </small>
                </span>
                <strong>{grams(entry.grams)}</strong>
                <span className="gh-entry-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gh-empty">아직 기록한 음식이 없어요.</p>
      )}
    </section>
  )
}

export function ShakerHome(props: HomeProps) {
  const { total, target, remaining, percent, onAdd, onShare } = props
  const fill = fillValue(percent)

  return (
    <section className="gh-screen gh-shaker">
      <header className="gh-shaker-head">
        <div className="gh-shaker-brand">
          <span aria-hidden="true">
            <Icon name="shake" size={20} />
          </span>
          <h2>쉐이커 충전</h2>
        </div>
        <span>오늘</span>
      </header>

      <div className="gh-shaker-hero" style={{ '--gh-fill-offset': `${100 - fill}%` } as CSSProperties}>
        <div className="gh-shaker-metrics">
          <p>
            오늘 기록한
            <br />
            단백질
          </p>
          <div className="gh-shaker-value">
            {formatGrams(total)}
            <small> g</small>
          </div>
          <div className="gh-shaker-target">목표 {grams(target)}</div>
          {remaining > 0 ? (
            <span className="gh-shaker-chip">{remainingLabel(remaining)}</span>
          ) : (
            <button className="gh-shaker-chip" type="button" onClick={onShare}>
              목표 달성 · 공유하기
            </button>
          )}
        </div>
        <div className="gh-shaker-scene" aria-hidden="true">
          <span className="gh-shaker-orbit" />
          <span className="gh-shaker-shadow" />
          <div className="gh-shaker-bottle">
            <div className="gh-shaker-spout" />
            <div className="gh-shaker-cap" />
            <div className="gh-shaker-body">
              <div className="gh-shaker-liquid" />
              <div className="gh-shaker-reflection" />
              <div className="gh-shaker-scale" />
              <div className="gh-shaker-print">
                W<span>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GraphicAdd onClick={() => onAdd()}>단백질 기록</GraphicAdd>
      <GraphicQuick onQuick={props.onQuick} />
      <GraphicEntries entries={props.entries} onEdit={props.onEdit} />
    </section>
  )
}

export function PlateHome(props: HomeProps) {
  const { total, target, remaining, percent, onAdd, onShare } = props

  return (
    <section className="gh-screen gh-plate">
      <header className="gh-plate-head">
        <span aria-hidden="true">✦</span>
        <h2>오늘의 단백질 접시</h2>
        <span aria-hidden="true">✦</span>
      </header>
      <div
        className="gh-plate-setting"
        style={{ '--gh-plate-fill': `${fillValue(percent)}%` } as CSSProperties}
      >
        <span className="gh-plate-fork" aria-hidden="true" />
        <div className="gh-plate-dish">
          <div className="gh-plate-center">
            <span>오늘 담은 단백질</span>
            <div>
              {formatGrams(total)}
              <small> g</small>
            </div>
            <span>목표 {grams(target)}</span>
          </div>
        </div>
        <span className="gh-plate-knife" aria-hidden="true" />
      </div>
      <div className="gh-plate-status">
        <span>{remainingLabel(remaining)}</span>
        {remaining === 0 && (
          <button type="button" onClick={onShare}>
            달성 카드 공유
          </button>
        )}
      </div>
      <GraphicAdd onClick={() => onAdd()}>음식 더 담기</GraphicAdd>
      <GraphicQuick onQuick={props.onQuick} />
      <GraphicEntries entries={props.entries} onEdit={props.onEdit} />
    </section>
  )
}

export function ReceiptHome({ entries, total, target, remaining, onEdit, onAdd, onShare }: HomeProps) {
  return (
    <section className="gh-screen gh-receipt">
      <div className="gh-receipt-paper">
        <header className="gh-receipt-head">
          <span className="gh-receipt-mark" aria-hidden="true">
            W.
          </span>
          <h2>단백질 영수증</h2>
          <p>오늘 · 기록 {entries.length}건</p>
        </header>
        <div className="gh-receipt-table">
          <div className="gh-receipt-row gh-receipt-labels">
            <span>시간</span>
            <span>기록한 음식</span>
            <span>단백질</span>
          </div>
          {entries.length ? (
            <ul aria-label="오늘 기록">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    className="gh-receipt-row"
                    type="button"
                    onClick={() => onEdit(entry)}
                    aria-label={`${entry.name} ${grams(entry.grams)} 수정`}
                  >
                    <span>{entry.time}</span>
                    <span>
                      {entry.name}
                      {entry.estimated && <small> 추정</small>}
                    </span>
                    <strong>{grams(entry.grams)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-empty">영수증에 담을 첫 기록을 추가해 보세요.</p>
          )}
        </div>
        <div className="gh-receipt-total">
          <span>오늘 기록 합계</span>
          <strong>
            {formatGrams(total)}
            <small> g</small>
          </strong>
        </div>
        <div className="gh-receipt-target">
          <span>오늘 목표</span>
          <strong>{grams(target)}</strong>
        </div>
        <div className="gh-receipt-stamp">{remainingLabel(remaining)}</div>
        <div className="gh-receipt-barcode" aria-hidden="true" />
      </div>
      <GraphicAdd onClick={() => onAdd()}>기록 추가</GraphicAdd>
      <button
        className="gh-receipt-alternate"
        type="button"
        onClick={remaining === 0 ? onShare : () => onAdd('direct')}
      >
        {remaining === 0 ? '달성 카드 공유' : '단백질 g 직접 입력'} <span aria-hidden="true">↗</span>
      </button>
    </section>
  )
}

export function CockpitHome(props: HomeProps) {
  const { entries, total, target, remaining, percent, onAdd, onShare } = props
  const fill = fillValue(percent)

  return (
    <section className="gh-screen gh-cockpit">
      <header className="gh-cockpit-head">
        <div>
          <span aria-hidden="true" />
          <h2>단백질 계기판</h2>
        </div>
        <span>오늘</span>
      </header>
      <div className="gh-cockpit-gauge" style={{ '--gh-arc-fill': `${fill * 0.75}%` } as CSSProperties}>
        <div className="gh-cockpit-ticks" aria-hidden="true" />
        <div className="gh-cockpit-arc" aria-hidden="true" />
        <div className="gh-cockpit-dial">
          <span>기록한 단백질</span>
          <div>
            {formatGrams(total)}
            <small> g</small>
          </div>
          <strong>{formatGrams(fill)}%</strong>
        </div>
        <span className="gh-cockpit-start" aria-hidden="true">
          0 g
        </span>
        <span className="gh-cockpit-end">목표 {grams(target)}</span>
      </div>
      <div className="gh-cockpit-readout">
        <div>
          <span>남은 단백질</span>
          <strong>{grams(remaining)}</strong>
        </div>
        <div>
          <span>오늘 기록</span>
          <strong>
            {entries.length}
            <small> 건</small>
          </strong>
        </div>
      </div>
      {remaining === 0 && (
        <button className="gh-cockpit-share" type="button" onClick={onShare}>
          목표 달성 · 카드 공유 <span aria-hidden="true">↗</span>
        </button>
      )}
      <GraphicAdd onClick={() => onAdd()}>단백질 기록</GraphicAdd>
      <GraphicQuick onQuick={props.onQuick} />
      <GraphicEntries entries={entries} onEdit={props.onEdit} />
    </section>
  )
}

export function BlocksHome(props: HomeProps) {
  const { entries, total, target, remaining, onAdd, onQuick, onShare } = props
  const blockCount = Math.ceil(target / 10)
  const wallColumns = Math.min(5, Math.max(3, Math.ceil(blockCount / 3)))

  return (
    <section className="gh-screen gh-blocks">
      <header className="gh-blocks-head">
        <div className="gh-blocks-logo" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <h2>10g 단백질 블록</h2>
      </header>
      <div className="gh-blocks-summary">
        <div>
          <p>오늘 기록한 단백질</p>
          <strong>
            {formatGrams(total)}
            <small> g</small>
          </strong>
        </div>
        <div>
          <span>목표 {grams(target)}</span>
          <span>{remainingLabel(remaining)}</span>
        </div>
      </div>
      <div className="gh-blocks-board">
        <div
          className="gh-blocks-wall"
          aria-hidden="true"
          style={{ '--gh-wall-columns': wallColumns } as CSSProperties}
        >
          {Array.from({ length: blockCount }, (_, index) => {
            const maxGrams = Math.min(10, target - index * 10)
            const progress = Math.max(0, Math.min(1, (total - index * 10) / maxGrams))
            return (
              <div
                className="gh-blocks-tile"
                key={index}
                style={{ '--gh-tile-fill': `${progress * 100}%` } as CSSProperties}
              >
                <span />
                <span />
              </div>
            )
          })}
        </div>
        <p>블록 하나에 단백질 {target % 10 ? '최대 ' : ''}10 g</p>
      </div>
      <button
        className="gh-blocks-stack"
        type="button"
        onClick={() => onQuick({ name: '단백질 블록', grams: 10, icon: 'plus' })}
      >
        <span className="gh-blocks-stack-icon" aria-hidden="true">
          <Icon name="plus" size={23} />
        </span>
        <span>
          <strong>10 g 바로 기록</strong>
          <small>블록 1개 채우기</small>
        </span>
      </button>
      <div className="gh-blocks-actions">
        <button type="button" onClick={() => onAdd('direct')}>
          다른 양 기록 <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={remaining === 0 ? onShare : () => onAdd('estimate')}>
          {remaining === 0 ? '달성 카드 공유' : '식사량 추정'} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <GraphicEntries entries={entries} onEdit={props.onEdit} />
    </section>
  )
}
