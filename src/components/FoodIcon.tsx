import { Utensils } from 'lucide-react'
import { DEFAULT_FOOD_ICON, findFoodIcon } from './food-icons'

const catalogIcons: Record<string, string> = {
  chicken: 'drumstick',
  shake: 'cup-soda',
  yogurt: 'milk',
  eggs: 'egg',
  'chicken-salad': 'salad',
  'tofu-bowl': 'soup',
  'meal-carb': 'wheat',
  'meal-balanced': DEFAULT_FOOD_ICON,
  'meal-meat-fish': 'fish',
  'meal-protein': 'drumstick',
}

export function FoodIcon({
  id,
  iconId,
  className,
  size = 22,
}: {
  id?: string
  iconId?: string
  className?: string
  size?: number
}) {
  const catalogIconId = id && Object.hasOwn(catalogIcons, id) ? catalogIcons[id] : undefined
  const Icon = (findFoodIcon(iconId) ?? findFoodIcon(catalogIconId))?.Icon ?? Utensils

  return <Icon className={className} size={size} strokeWidth={1.65} aria-hidden="true" />
}
