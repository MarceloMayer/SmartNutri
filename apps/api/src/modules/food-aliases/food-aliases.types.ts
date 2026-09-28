export interface FoodAlias {
  id: number;
  foodId: number;
  alias: string;
}

export interface FoodAliasesQuery {
  foodId?: number;
  q?: string;
  limit?: number;
}
