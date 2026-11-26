import {
  Apple, Banana, Bean, Beef, Beer, BottleWine, Cake, CakeSlice, Candy, CandyCane,
  Carrot, ChefHat, Cherry, Citrus, Coffee, Cookie, CookingPot, Croissant, CupSoda,
  Cupcake, Dessert, Donut, Drumstick, Egg, EggFried, Fish, FishSymbol, ForkKnife,
  GlassWater, Grape, Ham, Hamburger, IceCreamBowl, IceCreamCone, Leaf, LeafyGreen,
  Martini, Milk, Nut, Pizza, Popcorn, Popsicle, Salad, Sandwich, Shell, Soup,
  Sprout, Utensils, UtensilsCrossed, Vegan, Wheat, Wine, type LucideIcon,
} from 'lucide-react'

type IconChoice = { id: string; label: string; Icon: LucideIcon }

export const DEFAULT_FOOD_ICON = 'utensils'

export const foodIconGroups = [
  {
    id: 'meals', label: '식사', icons: [
      { id: DEFAULT_FOOD_ICON, label: '식사', Icon: Utensils },
      { id: 'fork-knife', label: '양식', Icon: ForkKnife },
      { id: 'utensils-crossed', label: '간편식', Icon: UtensilsCrossed },
      { id: 'soup', label: '국·찌개', Icon: Soup },
      { id: 'pot', label: '냄비 요리', Icon: CookingPot },
      { id: 'chef', label: '요리', Icon: ChefHat },
      { id: 'salad', label: '샐러드', Icon: Salad },
      { id: 'sandwich', label: '샌드위치', Icon: Sandwich },
      { id: 'burger', label: '햄버거', Icon: Hamburger },
      { id: 'pizza', label: '피자', Icon: Pizza },
      { id: 'croissant', label: '빵', Icon: Croissant },
      { id: 'wheat', label: '곡물', Icon: Wheat },
    ],
  },
  {
    id: 'protein', label: '단백질', icons: [
      { id: 'drumstick', label: '닭고기', Icon: Drumstick },
      { id: 'beef', label: '소고기', Icon: Beef },
      { id: 'ham', label: '햄', Icon: Ham },
      { id: 'fish', label: '생선', Icon: Fish },
      { id: 'fish-symbol', label: '생선살', Icon: FishSymbol },
      { id: 'shell', label: '조개', Icon: Shell },
      { id: 'egg', label: '달걀', Icon: Egg },
      { id: 'egg-fried', label: '달걀 프라이', Icon: EggFried },
      { id: 'bean', label: '콩·두부', Icon: Bean },
      { id: 'nut', label: '견과류', Icon: Nut },
    ],
  },
  {
    id: 'produce', label: '채소·과일', icons: [
      { id: 'carrot', label: '당근', Icon: Carrot },
      { id: 'leafy-green', label: '잎채소', Icon: LeafyGreen },
      { id: 'sprout', label: '새싹', Icon: Sprout },
      { id: 'vegan', label: '채식', Icon: Vegan },
      { id: 'leaf', label: '허브', Icon: Leaf },
      { id: 'apple', label: '사과', Icon: Apple },
      { id: 'banana', label: '바나나', Icon: Banana },
      { id: 'grape', label: '포도', Icon: Grape },
      { id: 'cherry', label: '체리', Icon: Cherry },
      { id: 'citrus', label: '감귤류', Icon: Citrus },
    ],
  },
  {
    id: 'drinks', label: '음료', icons: [
      { id: 'milk', label: '우유·유제품', Icon: Milk },
      { id: 'cup-soda', label: '쉐이크', Icon: CupSoda },
      { id: 'glass-water', label: '물·주스', Icon: GlassWater },
      { id: 'coffee', label: '커피·차', Icon: Coffee },
      { id: 'beer', label: '맥주', Icon: Beer },
      { id: 'wine', label: '와인', Icon: Wine },
      { id: 'bottle-wine', label: '병 음료', Icon: BottleWine },
      { id: 'martini', label: '칵테일', Icon: Martini },
    ],
  },
  {
    id: 'snacks', label: '간식', icons: [
      { id: 'popcorn', label: '팝콘', Icon: Popcorn },
      { id: 'cookie', label: '쿠키', Icon: Cookie },
      { id: 'donut', label: '도넛', Icon: Donut },
      { id: 'cake', label: '케이크', Icon: Cake },
      { id: 'cake-slice', label: '조각 케이크', Icon: CakeSlice },
      { id: 'cupcake', label: '컵케이크', Icon: Cupcake },
      { id: 'dessert', label: '푸딩', Icon: Dessert },
      { id: 'ice-cream-bowl', label: '빙과', Icon: IceCreamBowl },
      { id: 'ice-cream-cone', label: '아이스크림', Icon: IceCreamCone },
      { id: 'popsicle', label: '아이스바', Icon: Popsicle },
      { id: 'candy', label: '사탕', Icon: Candy },
      { id: 'candy-cane', label: '막대사탕', Icon: CandyCane },
    ],
  },
] satisfies { id: string; label: string; icons: IconChoice[] }[]

const iconChoices = new Map(foodIconGroups.flatMap(({ icons }) => icons.map((icon) => [icon.id, icon])))

export function findFoodIcon(id: string | undefined) {
  return id ? iconChoices.get(id) : undefined
}
