export type Mode = 'quick' | 'estimate' | 'direct'

export type Food = {
  name: string
  grams: number
  icon: 'shake' | 'egg' | 'chicken' | 'yogurt' | 'tofu' | 'meal' | 'plus'
}

export type Entry = Food & {
  id: string
  time: string
  estimated?: boolean
  note?: string
}

export type HomeProps = {
  entries: Entry[]
  total: number
  target: number
  remaining: number
  percent: number
  onQuick: (food: Food) => void
  onAdd: (mode?: Mode) => void
  onEdit: (entry: Entry) => void
  onShare: () => void
}

export const target = 120

export const quickFoods: Food[] = [
  { name: '프로틴 1스쿱', grams: 24, icon: 'shake' },
  { name: '닭가슴살 100g', grams: 23, icon: 'chicken' },
  { name: '삶은 달걀 2개', grams: 12, icon: 'egg' },
  { name: '그릭요거트 100g', grams: 9, icon: 'yogurt' },
  { name: '두부 반 모', grams: 12, icon: 'tofu' },
  { name: '프로틴 음료 1병', grams: 20, icon: 'shake' },
]

const sample: Entry[] = [
  { ...quickFoods[0], id: 'breakfast', time: '08:10' },
  { name: '한식 백반', grams: 22, icon: 'meal', id: 'lunch', time: '12:35', estimated: true },
  { name: '연어와 두부', grams: 39, icon: 'meal', id: 'dinner', time: '17:40' },
]
const evening: Entry = { ...quickFoods[1], id: 'evening', time: '19:05' }
const finish: Entry = { ...quickFoods[2], id: 'finish', time: '20:10' }

export const presets = [
  { id: 'empty', name: '첫 기록 전', grams: 0, entries: [] as Entry[] },
  { id: 'started', name: '기록 시작', grams: 24, entries: sample.slice(0, 1) },
  { id: 'middle', name: '진행 중', grams: 85, entries: sample },
  { id: 'near', name: '목표 근접', grams: 108, entries: [...sample, evening] },
  { id: 'done', name: '목표 달성', grams: 120, entries: [...sample, evening, finish] },
] as const

export const mealTypes = [
  { name: '가볍게', description: '샐러드 · 토스트', grams: [6, 8, 10] },
  { name: '탄수화물 위주', description: '김밥 · 국수', grams: [8, 12, 16] },
  { name: '균형 잡힌 일반식', description: '한식 백반 · 도시락', grams: [15, 22, 29] },
  { name: '고기·생선 위주', description: '닭갈비 · 생선구이', grams: [28, 40, 52] },
]

export function timeNow() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export function formatGrams(grams: number) {
  return Number(grams.toFixed(1)).toString()
}
