import { useId, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { LayoutContent } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ChevronDown, Trash2, X } from 'lucide-react'
import type { CatalogFood } from '../app/data'
import { estimateMeal, proteinForMealWeight } from '../app/meal-estimates'
import { customFoodId, type FoodItem, type FoodPortion, type Profile, type ProteinRecord } from '../app/model'
import { AmountStepper } from './AmountStepper'
import { FoodIcon } from './FoodIcon'
import { DEFAULT_FOOD_ICON, findFoodIcon, foodIconGroups } from './food-icons'
import '../screens/log.css'
import './food-entry.css'

type ServingFood = CatalogFood & { serving: FoodPortion }
type Amounts = {
  portion: string
  protein: string | null
  edited: 'portion' | 'protein'
}

const amountLabels: Record<FoodPortion['unit'], string> = {
  g: '섭취한 중량 (g)',
  개: '섭취한 수량 (개)',
  회분: '섭취한 양 (회분)',
  컵: '섭취한 양 (컵)',
  그릇: '섭취한 양 (그릇)',
  팩: '섭취한 수량 (팩)',
  병: '섭취한 수량 (병)',
  인분: '섭취한 양 (인분)',
}
const maxProtein = 300
const maxMealWeightG = 2000
const countSteps = [0.5, 1] as const

function readAmount(text: string, decimal = false) {
  const normalized = text.trim().replace(',', '.')
  const pattern = decimal ? /^(?:\d+(?:\.\d*)?|\.\d+)$/ : /^\d+$/
  if (!pattern.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function estimatePortion(food: ServingFood, protein: number) {
  return Number(((protein * food.serving.amount) / food.proteinG).toFixed(2))
}

function mealServings(portion: FoodPortion | undefined, referenceWeightG: number) {
  if (!portion || !Number.isFinite(portion.amount) || portion.amount <= 0) return ''
  if (portion.unit === '인분') return String(portion.amount)
  if (portion.unit === 'g') {
    const servings = portion.amount / referenceWeightG
    return String(Number(servings.toFixed(2)) || Number(servings.toFixed(3)))
  }
  return ''
}

function latestRecord(records: readonly ProteinRecord[], matches: (record: ProteinRecord) => boolean) {
  let latest: ProteinRecord | undefined
  for (const record of records) {
    if (matches(record) && (!latest || record.takenAt >= latest.takenAt)) latest = record
  }
  return latest
}

function initialAmounts(item: CatalogFood | undefined, previous?: ProteinRecord): Amounts {
  const protein = previous ? String(previous.proteinG) : item ? String(item.proteinG) : null
  if (!item || !('serving' in item)) return { portion: '', protein, edited: 'protein' }

  const savedPortion = previous?.portion
  const portion = previous
    ? savedPortion?.unit === item.serving.unit &&
      Number.isFinite(savedPortion.amount) &&
      savedPortion.amount > 0
      ? savedPortion.amount
      : estimatePortion(item, previous.proteinG)
    : item.serving.amount
  return { portion: String(portion), protein, edited: 'portion' }
}

function FoodIconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [category, setCategory] = useState(() =>
    foodIconGroups.find(({ icons }) => icons.some(({ id }) => id === value))?.id ?? foodIconGroups[0].id,
  )
  const group = foodIconGroups.find(({ id }) => id === category) ?? foodIconGroups[0]
  const selected = findFoodIcon(value)

  return (
    <div className="food-icon-picker">
      <button
        type="button"
        className="food-icon-trigger"
        aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        ref={trigger}
        onClick={() => {
          if (!expanded) {
            trigger.current?.focus({ preventScroll: true })
            const selectedGroup = foodIconGroups.find(({ icons }) => icons.some(({ id }) => id === value))
            if (selectedGroup) setCategory(selectedGroup.id)
          }
          setExpanded(!expanded)
        }}
      >
        <span>아이콘</span>
        <span className="food-icon-current">
          <FoodIcon iconId={value} size={20} />
          {selected?.label ?? '식사'}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="food-icon-options" id={id}>
          <div className="food-icon-groups" role="group" aria-label="아이콘 분류">
            {foodIconGroups.map(({ id, label }) => (
              <button type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="food-icon-choices" role="group" aria-label={`${group.label} 아이콘`}>
            {group.icons.map(({ id, label, Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={value === id}
                onClick={() => {
                  onChange(id)
                  trigger.current?.focus({ preventScroll: true })
                  setExpanded(false)
                }}
              >
                <Icon size={22} strokeWidth={1.65} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function FoodEntryDialog({
  item,
  initialName = '',
  records,
  record,
  profile,
  onClose,
  onSave,
  onDelete,
  deleteLabel = '기록 삭제',
}: {
  item?: CatalogFood
  initialName?: string
  records: readonly ProteinRecord[]
  record?: ProteinRecord
  profile?: Profile
  onClose: () => void
  onSave: (item: FoodItem) => void | Promise<void>
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void
  deleteLabel?: string
}) {
  const titleId = useId()
  const preset = item?.kind === 'meal'
  const meal = preset ? estimateMeal(item.id, profile) : undefined
  const historicalWeight = record?.mealReferenceWeightG
  const mealWeight = historicalWeight && Number.isFinite(historicalWeight) && historicalWeight > 0
    ? historicalWeight : meal?.weightG
  const servingFood = item && 'serving' in item ? item : undefined
  const [name, setName] = useState(record?.label ?? initialName)
  const [amounts, setAmounts] = useState<Amounts>(() => {
    const previous = record ?? (item && latestRecord(
      records,
      (entry) =>
        entry.catalogId === item.id ||
        (!entry.catalogId && customFoodId(entry.label) === customFoodId(item.name)),
    ))
    if (meal && mealWeight) {
      const recent = record ?? (previous?.mealReferenceWeightG === meal.weightG ? previous : undefined)
      const portion = recent ? mealServings(recent.portion, mealWeight) : '1'
      return { portion, protein: String(recent?.proteinG ?? meal.proteinG), edited: 'protein' }
    }
    return initialAmounts(item, previous)
  })
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const saveInProgress = useRef(false)
  const nameField = useRef<HTMLInputElement>(null)
  const portionField = useRef<HTMLInputElement>(null)
  const proteinField = useRef<HTMLInputElement>(null)

  const manualId = !item && !record && name.trim() ? customFoodId(name) : undefined
  const previousManual = manualId
    ? latestRecord(
        records,
        (entry) => entry.catalogId === manualId ||
          (entry.catalogId === 'manual' && customFoodId(entry.label) === manualId),
      )
    : undefined
  const iconId = selectedIconId ?? record?.iconId ?? item?.iconId ?? previousManual?.iconId
  const proteinInput = amounts.protein ?? (previousManual ? String(previousManual.proteinG) : '')
  const portionValue = readAmount(amounts.portion, true)
  const allowsProteinDecimals = Boolean(servingFood || record)
  const proteinG = readAmount(proteinInput, allowsProteinDecimals)
  const validPortion = portionValue !== null && portionValue > 0
  const maxMealServings = mealWeight ? Number((maxMealWeightG / mealWeight).toFixed(2)) : 1
  const mealPortionError = meal && (amounts.portion || amounts.edited === 'portion') &&
    (!validPortion || portionValue > maxMealServings)
    ? `0인분보다 많고 ${maxMealServings}인분 이하인 양을 입력해 주세요.`
    : ''
  const minimumProtein = allowsProteinDecimals ? 0.01 : 1
  const validProtein = proteinG !== null && proteinG >= minimumProtein && proteinG <= maxProtein
  const amountError =
    servingFood && amounts.edited === 'portion' && !validPortion
      ? '섭취한 양을 입력해 주세요.'
      : !validProtein
        ? `단백질 섭취량은 ${minimumProtein}~300g 사이로 기록할 수 있어요.`
        : ''

  function changePortion(value: string) {
    if (!servingFood) return
    const portion = readAmount(value, true)
    const protein =
      portion === null
        ? ''
        : String(Number(((portion * servingFood.proteinG) / servingFood.serving.amount).toFixed(2)))
    setAmounts({ portion: value, protein, edited: 'portion' })
  }

  function changeProtein(value: string) {
    const protein = readAmount(value, allowsProteinDecimals)
    const portion = servingFood && protein !== null ? String(estimatePortion(servingFood, protein)) : ''
    setAmounts({ portion, protein: value, edited: 'protein' })
  }

  async function save(food: FoodItem) {
    if (saveInProgress.current) return
    saveInProgress.current = true
    setSaving(true)
    setSaveError(false)
    try {
      await onSave(food)
    } catch {
      setSaveError(true)
    } finally {
      saveInProgress.current = false
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (!item && !name.trim()) {
      nameField.current?.focus()
      return
    }
    if (mealPortionError) {
      portionField.current?.focus()
      return
    }
    if (amountError || proteinG === null) {
      if (amounts.edited === 'portion') portionField.current?.focus()
      else proteinField.current?.focus()
      return
    }
    if (item) {
      const { id, kind, category, description } = item
      const portionUnit = meal ? '인분' : servingFood?.serving.unit
      const oldPortion = record?.portion
      const keepLegacyPortion = meal && mealWeight && oldPortion?.unit === 'g' &&
        amounts.portion === mealServings(oldPortion, mealWeight)
      void save({
        id,
        kind,
        name: record?.label ?? item.name,
        category,
        description,
        proteinG,
        iconId,
        portion: keepLegacyPortion ? oldPortion : validPortion && portionUnit
          ? { amount: portionValue, unit: portionUnit }
          : undefined,
        mealReferenceWeightG: meal ? mealWeight : undefined,
      })
    } else {
      void save({
        id: record?.catalogId ?? customFoodId(name),
        name: name.trim(),
        proteinG,
        kind: record?.estimated ? 'meal' : 'food',
        category: '직접 입력',
        description: '',
        iconId: iconId ?? DEFAULT_FOOD_ICON,
        portion: record?.portion,
      })
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !saveInProgress.current) onClose()
      }}
      purpose="info"
      width={416}
      padding={0}
      aria-labelledby={titleId}
      className="entry-dialog"
    >
      <LayoutContent padding={0} label="음식 기록 입력" className="entry-dialog-scroll">
        <form onSubmit={submit} className="entry-dialog-body" noValidate>
          <div className="entry-dialog-head">
            <h2 id={titleId}>{record?.label ?? item?.name ?? '직접 입력'}</h2>
            <Button variant="ghost" isIconOnly label="닫기" icon={<X size={19} />} isDisabled={saving} onClick={onClose} />
          </div>
          {item?.description && (
            <div className={preset ? 'meal-estimate-description' : 'entry-serving'}>
              <p>{item.description}</p>
              {servingFood && <p>기준 단백질 <strong>{servingFood.proteinG} g</strong></p>}
              {servingFood?.sourceUrl && (
                <a className="entry-nutrition-source" href={servingFood.sourceUrl} target="_blank" rel="noreferrer">영양정보 출처</a>
              )}
            </div>
          )}
          {meal && mealWeight && (
            <AmountStepper
              inputRef={portionField}
              label="섭취한 양 (인분)"
              description={`1인분 기준 단백질 약 ${proteinForMealWeight(mealWeight, meal.proteinPer100G)}g`}
              value={amounts.portion}
              current={portionValue ?? 0}
              max={maxMealServings}
              steps={countSteps}
              allowsDecimals
              placeholder="1"
              error={attempted ? mealPortionError : undefined}
              onChange={(value) => {
                const servings = readAmount(value, true)
                const protein = servings === null ? '' : String(proteinForMealWeight(servings * mealWeight, meal.proteinPer100G))
                setAmounts({ portion: value, protein, edited: 'portion' })
              }}
            />
          )}
          {!item && (
            <>
              <TextInput
                ref={nameField}
                label="음식 이름"
                value={name}
                onChange={setName}
                placeholder="예: 참치 샌드위치"
                enterKeyHint="next"
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229)
                    return
                  event.preventDefault()
                  proteinField.current?.focus()
                }}
                hasAutoFocus={!record}
                size="lg"
                controlClassName="entry-field"
                status={
                  attempted && !name.trim()
                    ? { type: 'error', message: '음식 이름을 입력해 주세요.' }
                    : undefined
                }
              />
              <FoodIconPicker value={iconId ?? DEFAULT_FOOD_ICON} onChange={setSelectedIconId} />
            </>
          )}
          {servingFood && (
            <AmountStepper
              inputRef={portionField}
              label={amountLabels[servingFood.serving.unit]}
              value={amounts.portion}
              current={portionValue ?? 0}
              max={estimatePortion(servingFood, maxProtein)}
              steps={servingFood.serving.unit === 'g' ? undefined : countSteps}
              allowsDecimals
              placeholder={String(servingFood.serving.amount)}
              error={attempted && amounts.edited === 'portion' ? amountError : undefined}
              onChange={changePortion}
            />
          )}
          <AmountStepper
            inputRef={proteinField}
            label={preset ? '한 끼 단백질 추정치 (g)' : '섭취한 단백질 (g)'}
            description={preset ? '실제 메뉴의 단백질량을 알면 직접 바꿀 수 있어요.' : undefined}
            value={proteinInput}
            current={proteinG ?? 0}
            allowsDecimals={allowsProteinDecimals}
            max={maxProtein}
            placeholder={servingFood ? String(servingFood.proteinG) : '1–300'}
            error={attempted && (amounts.edited === 'protein' || meal) && !mealPortionError ? amountError : undefined}
            onChange={meal ? (protein) => setAmounts((old) => ({ ...old, protein, edited: 'protein' })) : changeProtein}
          />
          {servingFood && (
            <output className="sr-only" aria-live="polite">
              {validPortion &&
                validProtein &&
                (amounts.edited === 'portion'
                  ? `단백질 ${proteinG}g`
                  : `섭취량 ${portionValue}${servingFood.serving.unit}`)}
            </output>
          )}
          {saveError && <p role="alert" className="storage-error">저장하지 못했어요. 인터넷 연결과 로그인 상태를 확인한 뒤 다시 시도해 주세요.</p>}
          <div className="food-entry-actions">
            <Button
              label={record ? '수정 저장' : '오늘 기록에 추가'}
              type="submit"
              variant="primary"
              size="lg"
              width="100%"
              className="entry-save"
              isLoading={saving}
              data-autofocus={preset && !record ? 'true' : undefined}
            />
            {onDelete && (
              <Button
                label={deleteLabel}
                variant="ghost"
                icon={<Trash2 size={17} />}
                type="button"
                className="food-entry-delete"
                isDisabled={saving}
                onClick={onDelete}
              />
            )}
          </div>
        </form>
      </LayoutContent>
    </Dialog>
  )
}
