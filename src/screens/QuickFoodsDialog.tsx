import { useId, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { LayoutContent } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Check, Search, Trash2, X } from 'lucide-react'
import { foodMatches, type CatalogFood } from '../app/data'
import { FoodIcon } from '../components/FoodIcon'

type Props = {
  foods: readonly CatalogFood[]
  foodIds: readonly string[]
  slot: number
  onClose: () => void
  onSelect: (foodId: string) => void
}

export function QuickFoodsDialog({ foods, foodIds, slot, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const titleId = useId()
  const hasFood = Boolean(foodIds[slot])
  const options = foods.filter((food) => foodMatches(food, query))

  return (
    <Dialog
      isOpen
      purpose="info"
      aria-labelledby={titleId}
      className="quick-edit-dialog"
      width={440}
      maxHeight="min(75dvh, calc(100dvh - var(--quick-dialog-top) - var(--quick-dialog-bottom) - 16px))"
      padding={0}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <header className="quick-edit-heading">
        <h2 id={titleId}>{hasFood ? '빠른 기록 변경' : '빠른 기록에 추가'}</h2>
        <Button variant="ghost" isIconOnly label="닫기" icon={<X size={19} />} onClick={onClose} />
        <div className="quick-edit-search">
          <TextInput
            label="음식 검색"
            isLabelHidden
            type="search"
            enterKeyHint="search"
            hasClear
            placeholder="검색"
            value={query}
            onChange={setQuery}
            startIcon={<Search size={17} />}
            width="100%"
          />
        </div>
      </header>
      <LayoutContent label="빠른 기록 음식 선택" className="quick-edit-content" padding={0}>
        {options.length ? (
          <ul className="quick-edit-list">
            {options.map((food) => {
              const position = foodIds.indexOf(food.id)
              const isCurrent = position === slot
              const action = isCurrent
                ? '현재 음식'
                : position >= 0
                  ? `${position + 1}번${hasFood ? '과 교체' : '에서 이동'}`
                  : ''

              return (
                <li key={food.id}>
                  <button
                    type="button"
                    className="quick-edit-option"
                    aria-current={isCurrent || undefined}
                    onClick={() => (isCurrent ? onClose() : onSelect(food.id))}
                  >
                    <FoodIcon id={food.id} iconId={food.iconId} size={19} />
                    <span>{food.name}</span>
                    {action && <small>{action}</small>}
                    {isCurrent && <Check size={16} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="quick-edit-empty" role="status">
            검색 결과가 없어요.
          </p>
        )}
      </LayoutContent>
      {hasFood && (
        <footer className="quick-edit-footer">
          <Button
            variant="ghost"
            label="빠른 기록에서 제거"
            icon={<Trash2 size={16} />}
            onClick={() => onSelect('')}
          />
        </footer>
      )}
    </Dialog>
  )
}
