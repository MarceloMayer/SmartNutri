import type { Pool, RowDataPacket } from 'mysql2/promise';

import type { Food, FoodGroup, FoodListQuery, FoodSearchQuery, FoodSearchResult } from './foods.types';

type FoodRow = RowDataPacket & Food;
type FoodSearchRow = RowDataPacket & Omit<FoodSearchResult, 'groups'>;
type FoodGroupRow = RowDataPacket & FoodGroup & {
  foodId: number;
};

export class FoodsRepository {
  constructor(private readonly db: Pool) {}

  async list(query: FoodListQuery): Promise<Food[]> {
    const limit = Math.min(query.limit ?? 20, 50);

    const [rows] = await this.db.query<FoodRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          taco_code AS tacoCode,
          source,
          kcal_per_100g AS kcalPer100g,
          carbs_per_100g AS carbsPer100g,
          protein_per_100g AS proteinPer100g,
          fat_per_100g AS fatPer100g,
          fiber_per_100g AS fiberPer100g,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM foods
        ORDER BY name ASC
        LIMIT :limit
      `,
      { limit }
    );

    return rows;
  }

  async search(query: FoodSearchQuery): Promise<FoodSearchResult[]> {
    const term = query.q?.trim() ?? '';
    const limit = Math.min(query.limit ?? 10, 10);

    if (!term) {
      return [];
    }

    const [rows] = await this.db.query<FoodSearchRow[]>(
      `
        SELECT
          foods.id,
          foods.name,
          foods.slug
        FROM foods
        LEFT JOIN food_aliases ON food_aliases.food_id = foods.id
        WHERE foods.name LIKE :likeTerm
          OR food_aliases.alias LIKE :likeTerm
        GROUP BY foods.id, foods.name, foods.slug
        ORDER BY
          MIN(
            CASE
              WHEN foods.name = :term OR food_aliases.alias = :term THEN 0
              WHEN foods.name LIKE :prefixTerm OR food_aliases.alias LIKE :prefixTerm THEN 1
              ELSE 2
            END
          ) ASC,
          foods.name ASC
        LIMIT :limit
      `,
      {
        term,
        likeTerm: `%${term}%`,
        prefixTerm: `${term}%`,
        limit
      }
    );

    if (rows.length === 0) {
      return [];
    }

    const groupsByFoodId = await this.findGroupsByFoodIds(rows.map((row) => row.id));

    return rows.map((row) => ({
      ...row,
      groups: groupsByFoodId.get(row.id) ?? []
    }));
  }

  private async findGroupsByFoodIds(foodIds: number[]): Promise<Map<number, FoodGroup[]>> {
    if (foodIds.length === 0) {
      return new Map();
    }

    const placeholders = foodIds.map(() => '?').join(', ');
    const [rows] = await this.db.query<FoodGroupRow[]>(
      `
        SELECT
          food_substitution_groups.food_id AS foodId,
          substitution_groups.id,
          substitution_groups.name,
          substitution_groups.slug
        FROM food_substitution_groups
        INNER JOIN substitution_groups
          ON substitution_groups.id = food_substitution_groups.substitution_group_id
        WHERE food_substitution_groups.food_id IN (${placeholders})
        ORDER BY substitution_groups.name ASC
      `,
      foodIds
    );

    return rows.reduce((groupsByFoodId, row) => {
      const groups = groupsByFoodId.get(row.foodId) ?? [];

      groups.push({
        id: row.id,
        name: row.name,
        slug: row.slug
      });

      groupsByFoodId.set(row.foodId, groups);
      return groupsByFoodId;
    }, new Map<number, FoodGroup[]>());
  }

  async findById(id: number): Promise<Food | null> {
    const [rows] = await this.db.query<FoodRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          taco_code AS tacoCode,
          source,
          kcal_per_100g AS kcalPer100g,
          carbs_per_100g AS carbsPer100g,
          protein_per_100g AS proteinPer100g,
          fat_per_100g AS fatPer100g,
          fiber_per_100g AS fiberPer100g,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM foods
        WHERE id = :id
        LIMIT 1
      `,
      { id }
    );

    return rows[0] ?? null;
  }
}
