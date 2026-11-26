import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react'
import { concepts, groups, type Group } from './catalog'
import { Focus, Split, Quick, Meals, Coach } from './concepts/utility'
import { DoodleHome, PhotoHome, StickerHome, QuestHome, ComicHome } from './concepts/mascot'
import { ShakerHome, PlateHome, ReceiptHome, CockpitHome, BlocksHome } from './concepts/graphic'
import { NightHome, WeekHome, CounterHome } from './concepts/rhythm'
import {
  formatGrams,
  presets,
  target,
  timeNow,
  type Entry,
  type Food,
  type HomeProps,
  type Mode,
} from './model'
import { RecordDialog, ShareDialog, StudioDialog } from './RecordDialog'
import { SourceDialog } from './SourceDialog'
import { EntryList, Icon } from './ui'

type Concept = (typeof concepts)[number]
type ConceptId = Concept['id']
type PresetId = (typeof presets)[number]['id']
type Modal =
  | { type: 'record'; mode: Mode; entry?: Entry }
  | { type: 'share' }
  | { type: 'source' }
  | { type: 'entries' }

const screens: Record<ConceptId, ComponentType<HomeProps>> = {
  focus: Focus,
  split: Split,
  quick: Quick,
  meals: Meals,
  coach: Coach,
  doodle: DoodleHome,
  photo: PhotoHome,
  sticker: StickerHome,
  quest: QuestHome,
  comic: ComicHome,
  shaker: ShakerHome,
  plate: PlateHome,
  receipt: ReceiptHome,
  cockpit: CockpitHome,
  blocks: BlocksHome,
  night: NightHome,
  week: WeekHome,
  counter: CounterHome,
}

function currentConcept() {
  return concepts.find((concept) => `#${concept.id}` === window.location.hash) ?? null
}

function Phone({ concept, props }: { concept: Concept; props: HomeProps }) {
  const Home = screens[concept.id]
  return (
    <div className="studio-phone">
      <div className="studio-phone-status" aria-hidden="true">
        <span>9:41</span>
        <i />
        <span className="studio-phone-signal">
          <span>▴▴▴</span>
          <b />
        </span>
      </div>
      <div className="studio-phone-body">
        <Home {...props} />
      </div>
    </div>
  )
}

function PreviewCard({
  concept,
  props,
  open,
}: {
  concept: Concept
  props: HomeProps
  open: () => void
}) {
  const [scale, setScale] = useState(0)
  const frame = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const measure = () => setScale(element.getBoundingClientRect().width / 390)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <article className="studio-preview-card" style={{ '--tray': concept.tray } as CSSProperties}>
      <div className="studio-preview-tray">
        <div className="studio-preview-shell" ref={frame} aria-hidden="true" inert>
          <div className="studio-preview-render" style={{ transform: `scale(${scale})` }}>
            <Phone concept={concept} props={props} />
          </div>
        </div>
      </div>
      <div className="studio-preview-label">
        <span className="studio-card-number">
          {String(concepts.indexOf(concept) + 1).padStart(2, '0')}
        </span>
        <h2>{concept.title}</h2>
        <Icon name="upRight" size={16} />
      </div>
      <a
        className="studio-card-link"
        href={`#${concept.id}`}
        onClick={open}
        aria-label={`${concept.title} 시안 열기`}
      />
    </article>
  )
}

export function Studio() {
  const [selected, setSelected] = useState(currentConcept)
  const [group, setGroup] = useState<Group>('all')
  const [entries, setEntries] = useState<Entry[]>(presets[2].entries)
  const [sampleId, setSampleId] = useState<PresetId>('middle')
  const [lastChange, setLastChange] = useState<{ entries: Entry[]; message: string } | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const galleryScroll = useRef(0)
  const detailScroll = useRef<HTMLDivElement>(null)
  const filter = group === 'all' ? concepts : concepts.filter((concept) => concept.group === group)
  const navigation = selected && filter.includes(selected) ? filter : concepts
  const selectedIndex = selected ? navigation.indexOf(selected) : -1
  const total = Number(formatGrams(entries.reduce((sum, entry) => sum + entry.grams, 0)))
  const remaining = Math.max(0, Number(formatGrams(target - total)))
  const percent = total >= target ? 100 : Math.min(99, Math.round((total / target) * 100))

  useEffect(() => {
    const onHash = () => setSelected(currentConcept())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useLayoutEffect(() => {
    window.scrollTo(0, selected ? 0 : galleryScroll.current)
    detailScroll.current?.scrollTo(0, 0)
  }, [selected])
  useEffect(() => {
    if (!selected || modal) return
    function navigate(event: KeyboardEvent) {
      const element = event.target as HTMLElement | null
      if (
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        element?.closest('input, textarea, select, button, [contenteditable]')
      )
        return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const offset = event.key === 'ArrowLeft' ? -1 : 1
        const index = (selectedIndex + offset + navigation.length) % navigation.length
        window.location.hash = navigation[index].id
      }
    }
    window.addEventListener('keydown', navigate)
    return () => window.removeEventListener('keydown', navigate)
  }, [selected, selectedIndex, navigation, modal])

  function choosePreset(id: PresetId) {
    const sample = presets.find((preset) => preset.id === id)
    if (!sample) return
    setEntries([...sample.entries])
    setSampleId(id)
    setLastChange(null)
  }

  function changeEntries(next: Entry[], message: string) {
    setLastChange({ entries, message })
    setEntries(next)
    setModal(null)
  }

  function addRecord(food: Food, options?: { estimated?: boolean; note?: string }) {
    changeEntries(
      [...entries, { ...food, ...options, id: crypto.randomUUID(), time: timeNow() }],
      `${food.name} · ${formatGrams(food.grams)}g 기록됨`,
    )
  }

  const homeProps: HomeProps = {
    entries,
    total,
    target,
    remaining,
    percent,
    onQuick: addRecord,
    onAdd: (mode = 'quick') => setModal({ type: 'record', mode }),
    onEdit: (entry) => setModal({ type: 'record', mode: 'direct', entry }),
    onShare: () => {
      if (total >= target) setModal({ type: 'share' })
    },
  }

  const statePicker = (
    <label className="studio-state-picker">
      <span>예시 상태</span>
      <select
        aria-label="예시 상태"
        value={sampleId}
        onChange={(event) => choosePreset(event.target.value as PresetId)}
      >
        {presets.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {item.grams}g
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="studio-wrap">
      <header className="studio-masthead">
        <a href="#" className="studio-wordmark" aria-label="단백하게 디자인 스튜디오 전체 시안">
          <span className="studio-mark">
            <Icon name="paw" size={23} />
          </span>
          <strong>Way to Go</strong>
          <span className="studio-edition">DESIGN STUDIO</span>
        </a>
        <nav aria-label="스튜디오 메뉴">
          <a href="#" className="studio-gallery-link">
            <Icon name="grid" size={16} />
            전체 시안
          </a>
          <button
            type="button"
            className="studio-text-button"
            onClick={() => setModal({ type: 'source' })}
          >
            <Icon name="code" size={17} />
            소스코드
          </button>
        </nav>
      </header>
      {selected ? (
        <main className="studio-detail">
          <header className="studio-detail-header">
            <a href="#" className="studio-back">
              <Icon name="arrow-left" size={17} />
              전체 시안
            </a>
            <div className="studio-arrows" aria-label="시안 이동">
              <a
                className="studio-icon-button"
                href={`#${navigation[(selectedIndex - 1 + navigation.length) % navigation.length].id}`}
                aria-label="이전 시안"
              >
                <Icon name="chevron-left" size={18} />
              </a>
              <span>
                {selectedIndex + 1} / {navigation.length}
              </span>
              <a
                className="studio-icon-button"
                href={`#${navigation[(selectedIndex + 1) % navigation.length].id}`}
                aria-label="다음 시안"
              >
                <Icon name="chevron-right" size={18} />
              </a>
            </div>
          </header>
          <div className="studio-detail-grid">
            <div className="studio-detail-stage" style={{ '--tray': selected.tray } as CSSProperties}>
              <div className="studio-detail-scroll" ref={detailScroll}>
                <Phone key={`${selected.id}-${sampleId}`} concept={selected} props={homeProps} />
              </div>
            </div>
            <aside className="studio-inspector">
              <span className="studio-group-name">
                {groups.find((item) => item.id === selected.group)?.name}
              </span>
              <h1>{selected.title}</h1>
              <p>{selected.description}</p>
              <div className="studio-inspector-data">
                <span>오늘 기록한 단백질</span>
                <strong>
                  {total}
                  <small> / {target}g</small>
                </strong>
              </div>
              {statePicker}
              <div className="studio-inspector-actions">
                <button
                  type="button"
                  className="studio-text-button"
                  onClick={() => choosePreset(sampleId)}
                >
                  <Icon name="undo" size={17} />
                  예시 기록 초기화
                </button>
                <button
                  type="button"
                  className="studio-text-button"
                  onClick={() => setModal({ type: 'entries' })}
                >
                  <Icon name="list" size={17} />
                  전체 기록
                </button>
                {total >= target && (
                  <button type="button" className="studio-text-button" onClick={homeProps.onShare}>
                    <Icon name="share" size={17} />
                    달성 카드
                  </button>
                )}
                <button
                  type="button"
                  className="studio-text-button"
                  onClick={() => setModal({ type: 'source' })}
                >
                  <Icon name="code" size={17} />
                  시안 소스코드
                </button>
              </div>
              <span className="studio-key-hint">
                <kbd>←</kbd>
                <kbd>→</kbd> 시안 전환
              </span>
            </aside>
          </div>
        </main>
      ) : (
        <main className="studio-gallery">
          <section className="studio-intro">
            <div>
              <div className="studio-title-line">
                <h1>단백하게 홈 화면</h1>
                <span>{concepts.length}가지 시안</span>
              </div>
              <p>같은 단백질 기록, 다른 홈 화면.</p>
            </div>
            <div className="studio-intro-data" aria-label={`오늘 기록 ${total}g, 목표 ${target}g`}>
              <strong>{total}</strong>
              <span> / {target}g</span>
            </div>
          </section>
          <div className="studio-filter-row">
            <div className="studio-filters" aria-label="시안 그룹">
              {groups.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={group === item.id}
                  onClick={() => setGroup(item.id)}
                >
                  {item.name}
                  {item.id === 'all' && <span>{concepts.length}</span>}
                </button>
              ))}
            </div>
            {statePicker}
          </div>
          <section className="studio-gallery-grid" aria-label={`${filter.length}개 홈 화면 시안`}>
            {filter.map((concept) => (
              <PreviewCard
                key={concept.id}
                concept={concept}
                props={homeProps}
                open={() => {
                  galleryScroll.current = window.scrollY
                }}
              />
            ))}
          </section>
        </main>
      )}
      {lastChange && (
        <div className="studio-toast">
          <Icon name="check" size={18} />
          <span role="status">{lastChange.message}</span>
          <button
            type="button"
            onClick={() => {
              setEntries(lastChange.entries)
              setLastChange(null)
            }}
          >
            되돌리기
          </button>
          <button type="button" onClick={() => setLastChange(null)} aria-label="기록 안내 닫기">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {modal?.type === 'record' && (
        <RecordDialog
          initialMode={modal.mode}
          entry={modal.entry}
          onClose={() => setModal(null)}
          onRecord={addRecord}
          onUpdate={(entry) =>
            changeEntries(
              entries.map((previous) => (previous.id === entry.id ? entry : previous)),
              '기록을 수정했어요.',
            )
          }
          onRemove={(entry) =>
            changeEntries(
              entries.filter((previous) => previous.id !== entry.id),
              '기록을 삭제했어요.',
            )
          }
        />
      )}
      {modal?.type === 'share' && (
        <ShareDialog total={total} target={target} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'source' && (
        <SourceDialog
          group={selected?.group ?? (group === 'all' ? 'utility' : group)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'entries' && (
        <StudioDialog title="오늘 기록" onClose={() => setModal(null)}>
          <EntryList entries={entries} onEdit={homeProps.onEdit} />
        </StudioDialog>
      )}
    </div>
  )
}
