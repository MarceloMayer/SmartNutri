export interface NutritionValues {
  kcalPer100g: number | null;
  carbsPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

export interface Food extends NutritionValues {
  id: number;
  name: string;
  slug: string;
  tacoCode: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodAlias {
  id: number;
  foodId: number;
  alias: string;
}

export interface SubstitutionGroup {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubstitutionGroupFood extends NutritionValues {
  id: number;
  name: string;
  slug: string;
  tacoCode: string | null;
  source: string;
}

export interface FoodSearchResult {
  id: number;
  name: string;
  slug: string;
  groups: SubstitutionGroup[];
}

export interface NutrientTotals {
  kcal: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
}

export interface NutrientDifference {
  absolute: number | null;
  percent: number | null;
}

export type EquivalenceNutrient = 'carbs' | 'protein' | 'fat';

export interface EquivalenceBasis {
  nutrient: EquivalenceNutrient;
  label: string;
  maxDifferencePercent: number;
}

export interface SubstituteResult {
  food: {
    id: number;
    name: string;
    slug: string;
  };
  isFavorite?: boolean;
  quantity: number;
  nutrients: NutrientTotals;
  differences: Record<keyof NutrientTotals, NutrientDifference>;
  score: number;
}

export interface CalculateSubstitutionsResponse {
  equivalence: EquivalenceBasis;
  reference: {
    food: {
      id: number;
      name: string;
      slug: string;
    };
    quantity: number;
    nutrients: NutrientTotals;
    groups: SubstitutionGroup[];
  };
  substitutes: SubstituteResult[];
}

export interface NutritionComparisonRow {
  label: string;
  baseValue: number | null;
  substituteValue: number | null;
  absoluteDifference: number | null;
  percentDifference: number | null;
  unit: string;
}
