import type { CustomFood, FoodItem, FoodPortion } from "./model";
import productCatalog from './product-catalog.json';

type MealPreset = FoodItem & {
  kind: "meal";
  searchTerms: string[];
};

export type CatalogFood =
  | (FoodItem & { kind: "food"; serving: FoodPortion; custom?: false; searchTerms?: string[]; sourceUrl?: string })
  | (FoodItem & CustomFood & { kind: "food"; custom: true })
  | (MealPreset & { custom?: false });

export const FOOD_CATALOG: CatalogFood[] = [
  // Rounded defaults for example meals, informed by K-FIND ingredient data.
  {
    id: "meal-carb",
    name: "탄수화물 위주 식사",
    proteinG: 14,
    kind: "meal",
    category: "일반식",
    searchTerms: ["밥", "면", "라면", "빵", "떡", "국수"],
    description: "밥·면·빵이 대부분이고 고기, 달걀, 두부 같은 반찬이 적은 한 끼예요.",
  },
  {
    id: "meal-balanced",
    name: "균형 잡힌 식사",
    proteinG: 29,
    kind: "meal",
    category: "일반식",
    searchTerms: ["백반", "정식", "가정식", "집밥"],
    description: "밥과 채소에 달걀·두부나 고기·생선 반찬을 곁들인 한 끼예요.",
  },
  {
    id: "meal-meat-fish",
    name: "고기·생선 위주 식사",
    proteinG: 49,
    kind: "meal",
    category: "일반식",
    searchTerms: ["고기위주식사", "생선위주식사", "제육", "불고기", "생선구이", "스테이크"],
    description: "제육이나 생선구이처럼 고기 또는 생선 한 접시가 주메뉴인 한 끼예요.",
  },
  {
    id: "meal-protein",
    name: "단백질을 넉넉히 먹은 식사",
    proteinG: 75,
    kind: "meal",
    category: "일반식",
    searchTerms: ["고단백", "단백질위주식사", "단백질반찬", "운동식"],
    description: "닭가슴살에 달걀이나 두부를 넉넉히 곁들인 것처럼 단백질 음식이 많은 한 끼예요.",
  },
  {
    id: "eggs",
    name: "삶은 달걀",
    proteinG: 6.5,
    serving: { amount: 1, unit: "개" },
    kind: "food",
    category: "표준 식품",
    description: "중간 크기 1개 (껍데기 제외 약 48g)",
    sourceUrl: 'https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?dbGrpCm=A&searchFoodCd=R110-003000046-0000',
  },
  ...productCatalog.map((product): CatalogFood => ({
    ...product,
    kind: 'food',
    serving: { amount: 1, unit: product.unit as FoodPortion['unit'] },
  })),
];

export function foodMatches(food: CatalogFood, query: string) {
  const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s·:]/g, '');
  const terms = 'searchTerms' in food ? food.searchTerms ?? [] : [];
  const searchable = [food.name, food.category, ...terms].map(normalize);
  return query.trim().split(/\s+/).every((word) => searchable.some((term) => term.includes(normalize(word))));
}

export function catalogFoods(customFoods: readonly CustomFood[] = [], base: readonly CatalogFood[] = FOOD_CATALOG): CatalogFood[] {
  return [
    ...base,
    ...customFoods.map((food) => ({
      ...food,
      kind: "food" as const,
      category: "추가한 음식",
      description: "",
      custom: true as const,
    })),
  ];
}
