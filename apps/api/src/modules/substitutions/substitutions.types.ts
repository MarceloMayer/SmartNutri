export interface Substitution {
  id: number;
  groupId: number;
  sourceFoodId: number;
  targetFoodId: number;
  sourceFoodName: string;
  targetFoodName: string;
  score: number | null;
  notes: string | null;
}

export interface SubstitutionsQuery {
  sourceFoodId?: number;
  groupId?: number;
  limit?: number;
}

export interface CalculateSubstitutionsBody {
  foodId: number;
  quantity: number;
  limit?: number;
}

export interface FoodForCalculation {
  id: number;
  name: string;
  slug: string;
  kcalPer100g: number | null;
  carbsPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

export interface SubstitutionGroupSummary {
  id: number;
  name: string;
  slug: string;
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
    groups: SubstitutionGroupSummary[];
  };
  substitutes: SubstituteResult[];
}

export type CalculateSubstitutionsResult =
  | {
      status: 'ok';
      data: CalculateSubstitutionsResponse;
    }
  | {
      status: 'not_found' | 'unprocessable';
      message: string;
    };
