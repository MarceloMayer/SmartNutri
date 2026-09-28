export const foodPreferenceTypes = ['favorite', 'avoid'] as const;

export type FoodPreferenceType = typeof foodPreferenceTypes[number];

export interface NutritionistFoodPreference {
  id: number;
  nutritionistUserId: number;
  foodId: number;
  preferenceType: FoodPreferenceType;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionistBlockedSubstitution {
  id: number;
  nutritionistUserId: number;
  referenceFoodId: number;
  blockedFoodId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodPreferenceParams {
  foodId: string;
}

export interface BlockedSubstitutionParams {
  referenceFoodId: string;
  blockedFoodId: string;
}

export interface UpsertFoodPreferenceBody {
  preferenceType: FoodPreferenceType;
}

export interface BlockSubstitutionBody {
  referenceFoodId: number;
  blockedFoodId: number;
}
