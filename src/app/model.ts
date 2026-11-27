export type Purpose = "balance" | "muscle" | "diet";
export type ProfileSex = "male" | "female";
export type FoodKind = "food" | "meal";
export type RecordSource = "quick" | "food" | "estimate";
export const MAX_QUICK_FOODS = 5;
const starterQuickFoodIds = ["eggs", "product-4bba4b3a2b9c6bde", "meal-meat-fish"];
export type FoodPortion = {
  amount: number;
  unit: "g" | "개" | "회분" | "컵" | "그릇" | "팩" | "병" | "인분";
};

export type Profile = {
  heightCm: number;
  weightKg: number;
  sex?: ProfileSex | null;
  purpose: Purpose;
};

export type FoodItem = {
  id: string;
  name: string;
  proteinG: number;
  kind: FoodKind;
  category: string;
  description: string;
  iconId?: string;
  portion?: FoodPortion;
  mealReferenceWeightG?: number;
};

export type CustomFood = Pick<FoodItem, "id" | "name" | "proteinG" | "iconId"> & { isDeleted?: boolean };

export type ProteinRecord = {
  id: string;
  ownerId?: string;
  catalogId?: string;
  label: string;
  proteinG: number;
  localDate: string;
  takenAt: string;
  source: RecordSource;
  estimated: boolean;
  iconId?: string;
  portion?: FoodPortion;
  mealReferenceWeightG?: number;
};

export type AppState = {
  schemaVersion: 1;
  profile: Profile;
  goalG: number;
  profileConfigured?: boolean;
  eveningReminderEnabled: boolean;
  favoriteFoodIds: string[];
  quickFoodIds?: string[];
  records: ProteinRecord[];
};

export type AppAction =
  | { type: "COMPLETE_SETUP"; profile: Profile; goalG: number }
  | { type: "ADD_RECORD"; record: ProteinRecord }
  | { type: "TOGGLE_FAVORITE"; foodId: string }
  | { type: "SET_QUICK_FOODS"; foodIds: string[] }
  | { type: "UPDATE_RECORD"; recordId: string; item: FoodItem }
  | { type: "DELETE_RECORD"; recordId: string }
  | { type: "SET_GOAL"; goalG: number }
  | { type: "SET_EVENING_REMINDER"; enabled: boolean };

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateWithOffset(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toLocalDate(date);
}

export function roundProtein(grams: number) {
  return Math.round(grams * 100) / 100;
}

export function createRecord(
  item: FoodItem,
  source: RecordSource,
): ProteinRecord {
  const now = new Date();
  return {
    id: `${item.id}-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    catalogId: item.id,
    label: item.name,
    proteinG: roundProtein(item.proteinG),
    localDate: toLocalDate(now),
    takenAt: now.toISOString(),
    source,
    estimated: item.kind === "meal",
    iconId: item.iconId,
    portion: item.portion,
    mealReferenceWeightG: item.mealReferenceWeightG,
  };
}

export function customFoodId(name: string) {
  const key = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
  return `custom:${key}`;
}

export function createInitialState(): AppState {
  return {
    schemaVersion: 1,
    profile: {
      heightCm: 172,
      weightKg: 68,
      purpose: "balance",
    },
    goalG: 110,
    profileConfigured: false,
    eveningReminderEnabled: false,
    favoriteFoodIds: [],
    quickFoodIds: [...starterQuickFoodIds],
    records: [],
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "COMPLETE_SETUP":
      return {
        ...state,
        profileConfigured: true,
        profile: action.profile,
        goalG: Math.max(1, Math.round(action.goalG)),
      };
    case "ADD_RECORD":
      return { ...state, records: [...state.records, action.record] };
    case "TOGGLE_FAVORITE": {
      const saved = state.favoriteFoodIds;
      const favoriteFoodIds = saved.includes(action.foodId)
        ? saved.filter((id) => id !== action.foodId)
        : [action.foodId, ...saved];
      return { ...state, favoriteFoodIds };
    }
    case "SET_QUICK_FOODS":
      return { ...state, quickFoodIds: normalizeQuickFoods(action.foodIds) };
    case "UPDATE_RECORD":
      return {
        ...state,
        records: state.records.map((record) =>
          record.id === action.recordId
            ? {
                ...record,
                label: action.item.name,
                proteinG: Math.max(0.01, roundProtein(action.item.proteinG)),
                portion: action.item.portion,
                mealReferenceWeightG: action.item.mealReferenceWeightG ?? record.mealReferenceWeightG,
                iconId: action.item.iconId,
              }
            : record,
        ),
      };
    case "DELETE_RECORD":
      return {
        ...state,
        records: state.records.filter((record) => record.id !== action.recordId),
      };
    case "SET_GOAL":
      return { ...state, goalG: Math.max(1, Math.round(action.goalG)) };
    case "SET_EVENING_REMINDER":
      return { ...state, eveningReminderEnabled: action.enabled };
  }
}

export function normalizeQuickFoods(foodIds: readonly unknown[]) {
  const seen = new Set<string>();
  return foodIds.slice(0, MAX_QUICK_FOODS).map((id) => {
    if (typeof id !== "string" || !id || seen.has(id)) return "";
    seen.add(id);
    return id;
  });
}

export function recordsForDate(records: ProteinRecord[], date: string) {
  return records.filter((record) => record.localDate === date);
}

export function totalForDate(records: ProteinRecord[], date: string) {
  return recordsForDate(records, date).reduce(
    (total, record) => total + record.proteinG,
    0,
  );
}

export function streakForRecords(records: ProteinRecord[]) {
  let streak = 0;
  for (let offset = 0; offset > -365; offset -= 1) {
    if (totalForDate(records, dateWithOffset(offset)) <= 0) break;
    streak += 1;
  }
  return streak;
}

export function recommendGoal(profile: Profile) {
  const factor =
    profile.purpose === "muscle" ? 1.8 : profile.purpose === "diet" ? 1.5 : 1.6;
  return Math.round(profile.weightKg * factor);
}
