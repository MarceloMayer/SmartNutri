export interface SubstitutionGroup {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubstitutionGroupFood {
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
}

export interface SubstitutionGroupParams {
  id: string;
}

export interface SubstitutionGroupFoodParams extends SubstitutionGroupParams {
  foodId: string;
}

export interface CreateSubstitutionGroupBody {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateSubstitutionGroupBody {
  name: string;
  description?: string | null;
}

export interface UpdateSubstitutionGroupStatusBody {
  isActive: boolean;
}

export interface AddFoodToGroupBody {
  foodId: number;
}
