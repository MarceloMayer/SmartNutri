import type { Pool, RowDataPacket } from 'mysql2/promise';

import type { FoodPreferenceType } from '../nutritionist-preferences/nutritionist-preferences.types';
import type {
  FoodForCalculation,
  Substitution,
  SubstitutionGroupSummary,
  SubstitutionsQuery
} from './substitutions.types';

type SubstitutionRow = RowDataPacket & Substitution;
type FoodForCalculationRow = RowDataPacket & FoodForCalculation;
type SubstitutionGroupSummaryRow = RowDataPacket & SubstitutionGroupSummary;
type FoodPreferenceRow = RowDataPacket & {
  foodId: number;
  preferenceType: FoodPreferenceType;
};
type BlockedSubstitutionRow = RowDataPacket & {
  blockedFoodId: number;
};

export class SubstitutionsRepository {
  constructor(private readonly db: Pool) {}

  async list(query: SubstitutionsQuery): Promise<Substitution[]> {
    const sourceFoodId = query.sourceFoodId ?? null;
    const groupId = query.groupId ?? null;
    const limit = query.limit ?? 10;

    const [rows] = await this.db.query<SubstitutionRow[]>(
      `
        SELECT
          target_links.id,
          source_links.substitution_group_id AS groupId,
          source_links.food_id AS sourceFoodId,
          target_links.food_id AS targetFoodId,
          source_food.name AS sourceFoodName,
          target_food.name AS targetFoodName,
          NULL AS score,
          NULL AS notes
        FROM food_substitution_groups AS source_links
        INNER JOIN food_substitution_groups AS target_links
          ON target_links.substitution_group_id = source_links.substitution_group_id
          AND target_links.food_id <> source_links.food_id
        INNER JOIN foods AS source_food ON source_food.id = source_links.food_id
        INNER JOIN foods AS target_food ON target_food.id = target_links.food_id
        WHERE (:sourceFoodId IS NULL OR source_links.food_id = :sourceFoodId)
          AND (:groupId IS NULL OR source_links.substitution_group_id = :groupId)
        ORDER BY target_food.name ASC
        LIMIT :limit
      `,
      { sourceFoodId, groupId, limit }
    );

    return rows;
  }

  async findFoodById(foodId: number): Promise<FoodForCalculation | null> {
    const [rows] = await this.db.query<FoodForCalculationRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          kcal_per_100g AS kcalPer100g,
          carbs_per_100g AS carbsPer100g,
          protein_per_100g AS proteinPer100g,
          fat_per_100g AS fatPer100g,
          fiber_per_100g AS fiberPer100g
        FROM foods
        WHERE id = :foodId
        LIMIT 1
      `,
      { foodId }
    );

    return rows[0] ?? null;
  }

  async findGroupsByFoodId(foodId: number): Promise<SubstitutionGroupSummary[]> {
    const [rows] = await this.db.query<SubstitutionGroupSummaryRow[]>(
      `
        SELECT
          substitution_groups.id,
          substitution_groups.name,
          substitution_groups.slug
        FROM food_substitution_groups
        INNER JOIN substitution_groups
          ON substitution_groups.id = food_substitution_groups.substitution_group_id
        WHERE food_substitution_groups.food_id = :foodId
        ORDER BY substitution_groups.name ASC
      `,
      { foodId }
    );

    return rows;
  }

  async findCandidatesByGroupIds(
    referenceFoodId: number,
    groupIds: number[]
  ): Promise<FoodForCalculation[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const placeholders = groupIds.map(() => '?').join(', ');
    const [rows] = await this.db.query<FoodForCalculationRow[]>(
      `
        SELECT DISTINCT
          foods.id,
          foods.name,
          foods.slug,
          foods.kcal_per_100g AS kcalPer100g,
          foods.carbs_per_100g AS carbsPer100g,
          foods.protein_per_100g AS proteinPer100g,
          foods.fat_per_100g AS fatPer100g,
          foods.fiber_per_100g AS fiberPer100g
        FROM foods
        INNER JOIN food_substitution_groups
          ON food_substitution_groups.food_id = foods.id
        WHERE food_substitution_groups.substitution_group_id IN (${placeholders})
          AND foods.id <> ?
        ORDER BY foods.name ASC
      `,
      [...groupIds, referenceFoodId]
    );

    return rows;
  }

  async findPreferencesByFoodIds(
    nutritionistUserId: number,
    foodIds: number[]
  ): Promise<Map<number, FoodPreferenceType>> {
    if (foodIds.length === 0) {
      return new Map();
    }

    const placeholders = foodIds.map(() => '?').join(', ');
    const [rows] = await this.db.query<FoodPreferenceRow[]>(
      `
        SELECT
          food_id AS foodId,
          preference_type AS preferenceType
        FROM nutritionist_food_preferences
        WHERE nutritionist_user_id = ?
          AND food_id IN (${placeholders})
      `,
      [nutritionistUserId, ...foodIds]
    );

    return rows.reduce((preferencesByFoodId, row) => {
      preferencesByFoodId.set(row.foodId, row.preferenceType);
      return preferencesByFoodId;
    }, new Map<number, FoodPreferenceType>());
  }

  async findBlockedSubstitutionFoodIds(
    nutritionistUserId: number,
    referenceFoodId: number
  ): Promise<Set<number>> {
    const [rows] = await this.db.query<BlockedSubstitutionRow[]>(
      `
        SELECT blocked_food_id AS blockedFoodId
        FROM nutritionist_blocked_substitutions
        WHERE nutritionist_user_id = :nutritionistUserId
          AND reference_food_id = :referenceFoodId
      `,
      {
        nutritionistUserId,
        referenceFoodId
      }
    );

    return rows.reduce((blockedFoodIds, row) => {
      blockedFoodIds.add(row.blockedFoodId);
      return blockedFoodIds;
    }, new Set<number>());
  }
}
