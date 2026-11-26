import type { Profile } from './model'

export const mealReference = {
  heightCm: 170,
  weightKg: 70,
  heightShare: 0.45,
  weightShare: 0.55,
  maleFactor: 1.06,
  femaleFactor: 0.94,
  minimumFactor: 0.7,
  maximumFactor: 1.4,
  weightStepG: 10,
}

export const mealIngredients = {
  rice: {
    name: '백미밥',
    proteinPer100G: 3,
    source: 'https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/foodnutrient/searchDetail.do?code4=1&food_cd=100101005100300001&labor_cd=201&year2=2017',
  },
  egg: {
    name: '삶은 달걀',
    proteinPer100G: 13.49,
    source: 'https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?dbGrpCm=A&searchFoodCd=R110-003000046-0000',
  },
  pork: {
    name: '삼겹살구이',
    proteinPer100G: 22.56,
    source: 'https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?searchFoodCd=D108-382000000-0001&searchMonthCd=AVG&searchRegionCd=ZZ',
  },
  tofu: {
    name: '두부',
    proteinPer100G: 9.62,
    source: 'https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?dbGrpCm=A&searchFoodCd=R121-043020300-0000',
  },
  chicken: {
    name: '삶은 닭 살코기',
    proteinPer100G: 27.8,
    source: 'https://nongsaro.go.kr/portal/ps/psx/psxf/mtralListPop.ps',
  },
}

type MealIngredient = keyof typeof mealIngredients
type MealRecipe = {
  name: string
  referenceWeightG: number
  ingredients: ReadonlyArray<readonly [MealIngredient, number]>
}

export const mealRecipes = {
  'meal-carb': {
    name: '탄수화물 위주 식사',
    referenceWeightG: 340,
    ingredients: [['rice', 90], ['egg', 10]],
  },
  'meal-balanced': {
    name: '균형 잡힌 식사',
    referenceWeightG: 380,
    ingredients: [['rice', 70], ['pork', 20], ['tofu', 10]],
  },
  'meal-meat-fish': {
    name: '고기·생선 위주 식사',
    referenceWeightG: 380,
    ingredients: [['rice', 50], ['pork', 50]],
  },
  'meal-protein': {
    name: '단백질을 넉넉히 먹은 식사',
    referenceWeightG: 400,
    ingredients: [['rice', 25], ['chicken', 60], ['tofu', 15]],
  },
} satisfies Record<string, MealRecipe>

export function mealProteinPer100G(recipe: MealRecipe) {
  return recipe.ingredients.reduce((total, [ingredient, share]) =>
    total + mealIngredients[ingredient].proteinPer100G * share / 100, 0)
}

export function proteinForMealWeight(weightG: number, proteinPer100G: number) {
  return Math.round(weightG * proteinPer100G / 100)
}

export function estimateMeal(id: string, profile?: Profile) {
  if (!Object.hasOwn(mealRecipes, id)) return undefined
  const recipe = mealRecipes[id as keyof typeof mealRecipes]
  const reference = mealReference
  const heightRatio = profile && Number.isFinite(profile.heightCm) && profile.heightCm > 0
    ? profile.heightCm / reference.heightCm : 1
  const weightRatio = profile && Number.isFinite(profile.weightKg) && profile.weightKg > 0
    ? profile.weightKg / reference.weightKg : 1
  const sexFactor = profile?.sex === 'male' ? reference.maleFactor
    : profile?.sex === 'female' ? reference.femaleFactor : 1
  const factor = Math.min(reference.maximumFactor, Math.max(reference.minimumFactor,
    (heightRatio * reference.heightShare + weightRatio * reference.weightShare) * sexFactor,
  ))
  const weightG = Math.round(recipe.referenceWeightG * factor / reference.weightStepG) * reference.weightStepG
  const proteinPer100G = mealProteinPer100G(recipe)
  return { weightG, proteinPer100G, proteinG: proteinForMealWeight(weightG, proteinPer100G) }
}
