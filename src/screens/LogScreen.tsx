import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Bookmark, ChevronRight, Plus, Search } from 'lucide-react'
import { foodMatches, type CatalogFood } from '../app/data'
import type { AppState, FoodItem } from '../app/model'
import { FoodEntryDialog } from '../components/FoodEntryDialog'
import { FoodIcon } from '../components/FoodIcon'
import './log.css'

interface LogScreenProps {
  state: AppState
  foods: readonly CatalogFood[]
  onAdd: (item: FoodItem, registering: boolean) => Promise<void>
  onDeleteFood: (item: CatalogFood) => Promise<void>
  onToggleFavorite: (id: string) => void
}

type EntryDraft = { item?: CatalogFood; initialName?: string }
type FavoriteReorder = {
  list: HTMLElement
  movedRow: HTMLElement
  before: Map<HTMLElement, number>
  focus: HTMLButtonElement | null
  keyboard: boolean
}

export function LogScreen({ state, foods, onAdd, onDeleteFood, onToggleFavorite }: LogScreenProps) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<'confirm' | 'pending' | 'error' | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const draftOpener = useRef<HTMLButtonElement | null>(null)
  const deleteOpener = useRef<HTMLButtonElement | null>(null)
  const deletePending = useRef(false)
  const pendingReorder = useRef<FavoriteReorder | null>(null)
  const rowAnimations = useRef(new Map<HTMLElement, Animation>())
  const favoriteOrder = new Map(state.favoriteFoodIds.map((id, index) => [id, index]))
  const lastRank = state.favoriteFoodIds.length
  const matches = foods.filter((item) => foodMatches(item, query)).sort((a, b) =>
    (favoriteOrder.get(a.id) ?? lastRank) - (favoriteOrder.get(b.id) ?? lastRank),
  )
  const groups = [
    { id: 'general-meals', title: '일반식', items: matches.filter((item) => item.kind === 'meal') },
    { id: 'individual-foods', title: '음식', items: matches.filter((item) => item.kind === 'food') },
  ]

  useLayoutEffect(() => {
    const reorder = pendingReorder.current
    if (!reorder) return
    pendingReorder.current = null
    const { list, movedRow, before, focus, keyboard } = reorder
    const animations = rowAnimations.current
    for (const row of list.querySelectorAll<HTMLElement>('.entry-row')) {
      animations.get(row)?.cancel()
      delete row.dataset.reordering
    }

    if (focus?.isConnected) {
      if (document.activeElement !== focus) focus.focus({ preventScroll: true })
      if (keyboard) focus.scrollIntoView({ block: 'nearest' })
    }
    if (!before.size) return

    const listTop = list.getBoundingClientRect().top
    // Read the final layout before adding transforms. Measuring relative to the list ignores scroll changes.
    const moves = Array.from(before, ([row, top]) => ({
      row,
      delta: top - (row.getBoundingClientRect().top - listTop),
    }))
    for (const { row, delta } of moves) {
      if (!row.isConnected || Math.abs(delta) < .5) continue
      if (row === movedRow) row.dataset.reordering = ''
      const animation = row.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(.22, .75, .25, 1)' },
      )
      animations.set(row, animation)
      const clear = () => {
        if (animations.get(row) !== animation) return
        animations.delete(row)
        delete row.dataset.reordering
      }
      animation.onfinish = clear
      animation.oncancel = clear
    }
  }, [state.favoriteFoodIds])

  useEffect(() => {
    const animations = rowAnimations.current
    return () => {
      for (const animation of animations.values()) animation.cancel()
      animations.clear()
    }
  }, [])

  function toggleFavorite(event: MouseEvent<HTMLButtonElement>, id: string) {
    const button = event.currentTarget
    const list = button.closest<HTMLElement>('.entry-list')
    const movedRow = button.closest<HTMLElement>('.entry-row')
    if (list && movedRow) {
      const keyboard = event.detail === 0
      const before = new Map<HTMLElement, number>()
      if (!keyboard && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const listTop = list.getBoundingClientRect().top
        for (const row of list.querySelectorAll<HTMLElement>('.entry-row')) {
          before.set(row, row.getBoundingClientRect().top - listTop)
        }
      }
      pendingReorder.current = {
        list,
        movedRow,
        before,
        focus: keyboard || button === document.activeElement ? button : null,
        keyboard,
      }
    }
    onToggleFavorite(id)
  }

  function openDraft(event: MouseEvent<HTMLButtonElement>, next: EntryDraft) {
    draftOpener.current = event.currentTarget
    setDraft(next)
  }

  function closeDraft() {
    setDraft(null)
    requestAnimationFrame(() => {
      if (draftOpener.current?.isConnected) draftOpener.current.focus({ preventScroll: true })
    })
  }

  function openManual(event: MouseEvent<HTMLButtonElement>) {
    openDraft(event, { initialName: query.trim() })
  }

  async function confirmDeleteFood() {
    const food = draft?.item
    if (!food?.custom || deletePending.current) return
    deletePending.current = true
    setDeleteStatus('pending')
    try {
      await onDeleteFood(food)
      setDeleteStatus(null)
      setDraft(null)
      requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }))
    } catch {
      setDeleteStatus('error')
    } finally {
      deletePending.current = false
    }
  }

  function renderFood(item: CatalogFood) {
    const saved = favoriteOrder.has(item.id)
    return (
      <div className="entry-row" key={item.id}>
        <button
          type="button"
          className="entry-pick"
          onClick={(event) => openDraft(event, { item })}
          aria-label={`${item.name} 기록하기`}
        >
          <FoodIcon id={item.id} iconId={item.iconId} className="entry-food-icon" />
          <span>{item.name}</span>
          <ChevronRight className="entry-arrow" size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="entry-bookmark"
          onClick={(event) => toggleFavorite(event, item.id)}
          aria-pressed={saved}
          aria-label={`${item.name} 즐겨찾기 ${saved ? '해제' : '추가'}`}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className="entry-page">
      <header className="page-header entry-header">
        <h1 className="page-title">음식 검색</h1>
      </header>
      <section className="entry-catalog" aria-label="음식 찾기">
        <div className="entry-toolbar">
          <TextInput
            ref={searchInput}
            label="음식 검색"
            isLabelHidden
            type="search"
            enterKeyHint="search"
            hasClear
            placeholder="검색"
            value={query}
            onChange={setQuery}
            size="lg"
            startIcon={<Search size={20} />}
            controlClassName="entry-search"
            width="100%"
          />
          <Button
            label="음식 추가"
            variant="secondary"
            icon={<Plus size={17} />}
            onClick={openManual}
            className="entry-manual"
          />
        </div>
        <p className="sr-only" role="status">
          {query.trim() ? `검색 결과 ${matches.length}개` : ''}
        </p>
        {groups.filter((group) => group.items.length).map((group) => (
          <section key={group.id} aria-labelledby={group.id}>
            <h2 className="section-heading entry-list-heading" id={group.id}>{group.title}</h2>
            <div className="panel entry-list">{group.items.map(renderFood)}</div>
          </section>
        ))}
        {!matches.length && (
          <div className="panel entry-empty">
            <h2>일치하는 음식이 없어요</h2>
            <Button label="음식 추가" onClick={openManual} />
          </div>
        )}
      </section>
      {draft && (
        <FoodEntryDialog
          profile={state.profileConfigured ? state.profile : undefined}
          {...draft}
          records={state.records}
          onClose={closeDraft}
          deleteLabel="음식 삭제"
          onDelete={draft.item?.custom ? (event) => {
            deleteOpener.current = event.currentTarget
            setDeleteStatus('confirm')
          } : undefined}
          onSave={async (item) => {
            await onAdd(item, !draft.item)
            closeDraft()
          }}
        />
      )}
      {deleteStatus && draft?.item && (
        <AlertDialog
          isOpen
          title="음식을 삭제할까요?"
          description={deleteStatus === 'error'
            ? '음식을 삭제하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.'
            : `${draft.item.name}은 음식 목록에서 사라져요. 이미 남긴 섭취 기록은 보관돼요.`}
          cancelLabel="취소"
          actionLabel="음식 삭제"
          isActionLoading={deleteStatus === 'pending'}
          onAction={confirmDeleteFood}
          onOpenChange={(open) => {
            if (open || deletePending.current) return
            setDeleteStatus(null)
            requestAnimationFrame(() => deleteOpener.current?.focus({ preventScroll: true }))
          }}
        />
      )}
    </div>
  )
}
