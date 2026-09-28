export interface Food {
  id: number;
  name: string;
  slug: string;
  tacoCode: string | null;
  source: string;
  kcalPer100g: number | null;
  carbsPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoodGroup {
  id: number;
  name: string;
  slug: string;
}

export interface FoodSearchResult {
  id: number;
  name: string;
  slug: string;
  groups: FoodGroup[];
}

export interface FoodSearchQuery {
  q?: string;
  limit?: number;
}

export interface FoodListQuery {
  limit?: number;
}

export interface FoodParams {
  id: string;
}
