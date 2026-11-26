import type { CSSProperties, ReactNode } from 'react'
import { formatGrams, quickFoods, type Entry, type HomeProps } from './model'

const paths: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-left': <path d="m12 5-7 7 7 7M5 12h14" />,
  'arrow-right': <path d="m12 5 7 7-7 7M19 12H5" />,
  upRight: <path d="M6 18 18 6M7 6h11v11" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18" />,
  undo: <path d="M4 10h10a5 5 0 0 1 0 10h-3M8 6l-4 4 4 4" />,
  shake: <path d="M7 7h10l-1.2 13H8.2L7 7Zm-1 0h12V4H6zm5-3V2h4v2M9 12h4m-4 4h3" />,
  egg: <path d="M19 14.5a7 7 0 1 1-14 0C5 10.6 8.1 4 12 4s7 6.6 7 10.5Z" />,
  chicken: (
    <path d="M13.4 4.4c2.5-2 5.5-1.4 7.3.6 2.2 2.6 1 6-1.1 7.8-1.3 1.1-3.3 1.7-5 1.2l-4.3 4.3a2 2 0 0 1-2.9 2.5l-1.1-1.1-1.1-1.1a2 2 0 0 1 2.5-2.9l4.3-4.3c-.6-2.5-.1-5.1 1.4-7Z" />
  ),
  yogurt: <path d="M4 8h16l-2.5 11h-11L4 8Zm-1 0h18m-8 0 3-5m-6 10h4" />,
  tofu: <path d="m3 8 9-4 9 4v8l-9 4-9-4V8Zm0 0 9 4 9-4m-9 4v8" />,
  meal: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M2 8v8m20-8v8" />
    </>
  ),
  dumbbell: <path d="M8 12h8M3 9v6m18-6v6M5 7h3v10H5zm11 0h3v10h-3z" />,
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16M8 4v4m8-4v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  moon: <path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  sparkle: <path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" />,
  share: <path d="M12 16V3m-4 4 4-4 4 4M6 11H4v10h16V11h-2" />,
  download: <path d="M12 3v13m-4-4 4 4 4-4M5 17v4h14v-4" />,
  edit: <path d="m14 6 4 4M4 20l4.5-1L20 7.5 16.5 4 5 15.5 4 20Z" />,
  trash: <path d="M4 7h16m-9 4v6m3-6v6M8 7V4h8v3M6 7l1 13h10l1-13" />,
  bolt: <path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z" />,
  leaf: <path d="M5 19c5 0 12 0 14-14-8 0-14 3-14 9m0 5 8-8" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  home: <path d="m3 11 9-8 9 8m-2-1v10H5V10m5 10v-6h4v6" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="10" cy="18" r="2" fill="currentColor" />
    </>
  ),
  paw: (
    <g fill="currentColor" stroke="none">
      <ellipse cx="6" cy="9" rx="2.2" ry="3" transform="rotate(-24 6 9)" />
      <ellipse cx="10" cy="5.7" rx="2" ry="3" transform="rotate(-10 10 5.7)" />
      <ellipse cx="14.8" cy="5.8" rx="2" ry="3" transform="rotate(18 14.8 5.8)" />
      <ellipse cx="18.6" cy="9.3" rx="2.1" ry="2.8" transform="rotate(28 18.6 9.3)" />
      <path d="M12 10c-2.4 0-3.4 2-4.8 3.2C3.8 16.2 5.7 21 9.1 20c1-.3 2-.9 2.9-.9s1.9.6 2.9.9c3.4 1 5.3-3.8 1.9-6.8-1.4-1.2-2.4-3.2-4.8-3.2Z" />
    </g>
  ),
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.meal}
    </svg>
  )
}

export function Ring({ percent, children }: { percent: number; children?: ReactNode }) {
  return (
    <div className="p-ring" style={{ '--p-progress': `${percent}%` } as CSSProperties}>
      <div className="p-ring-content">{children}</div>
    </div>
  )
}

export function QuickButtons({
  onQuick,
  limit = 3,
}: {
  onQuick: HomeProps['onQuick']
  limit?: number
}) {
  return (
    <div className="p-quick-buttons" style={{ '--p-columns': limit } as CSSProperties}>
      {quickFoods.slice(0, limit).map((food) => (
        <button key={food.name} type="button" onClick={() => onQuick(food)}>
          <Icon name={food.icon} size={20} />
          <span>{food.name}</span>
          <strong>+{food.grams}g</strong>
        </button>
      ))}
    </div>
  )
}

export function EntryList({
  entries,
  onEdit,
  limit,
}: {
  entries: Entry[]
  onEdit: HomeProps['onEdit']
  limit?: number
}) {
  if (!entries.length) return <p className="p-empty">아직 기록이 없어요.</p>
  return (
    <ul className="p-entry-list">
      {[...entries]
        .reverse()
        .slice(0, limit)
        .map((entry) => (
          <li key={entry.id}>
            <button type="button" onClick={() => onEdit(entry)}>
              <span className="p-entry-icon">
                <Icon name={entry.icon} size={17} />
              </span>
              <span className="p-entry-text">
                <strong>{entry.name}</strong>
                <small>
                  {entry.time}
                  {entry.estimated && ' · 추정'}
                </small>
              </span>
              <b>{formatGrams(entry.grams)}g</b>
              <Icon name="chevron-right" size={15} />
            </button>
          </li>
        ))}
    </ul>
  )
}

export function AddButton({
  onClick,
  label = '단백질 기록하기',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button type="button" className="p-add" onClick={onClick}>
      <Icon name="plus" size={19} />
      {label}
    </button>
  )
}
