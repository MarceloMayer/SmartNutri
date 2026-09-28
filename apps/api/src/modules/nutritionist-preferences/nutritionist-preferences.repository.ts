import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type {
  FoodPreferenceType,
  NutritionistBlockedSubstitution,
  NutritionistFoodPreference
} from './nutritionist-preferences.types';

type TimestampValue = Date | string;
type FoodPreferenceRow = RowDataPacket & Omit<NutritionistFoodPreference, 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};
type BlockedSubstitutionRow = RowDataPacket & Omit<NutritionistBlockedSubstitution, 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};

export class NutritionistPreferencesRepository {
  constructor(private readonly db: Pool) {}

  async listFoodPreferences(nutritionistUserId: number): Promise<NutritionistFoodPreference[]> {
    const [rows] = await this.db.query<FoodPreferenceRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          food_id AS foodId,
          preference_type AS preferenceType,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM nutritionist_food_preferences
        WHERE nutritionist_user_id = :nutritionistUserId
        ORDER BY updated_at DESC
      `,
      { nutritionistUserId }
    );

    return rows.map(toFoodPreference);
  }

  async upsertFoodPreference(
    nutritionistUserId: number,
    foodId: number,
    preferenceType: FoodPreferenceType
  ): Promise<NutritionistFoodPreference> {
    await this.db.query<ResultSetHeader>(
      `
        INSERT INTO nutritionist_food_preferences (
          nutritionist_user_id,
          food_id,
          preference_type
        ) VALUES (
          :nutritionistUserId,
          :foodId,
          :preferenceType
        )
        ON DUPLICATE KEY UPDATE
          preference_type = VALUES(preference_type)
      `,
      {
        nutritionistUserId,
        foodId,
        preferenceType
      }
    );

    const preference = await this.findFoodPreference(nutritionistUserId, foodId);

    if (!preference) {
      throw new Error('Saved food preference was not found');
    }

    return preference;
  }

  async deleteFoodPreference(nutritionistUserId: number, foodId: number): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM nutritionist_food_preferences
        WHERE nutritionist_user_id = :nutritionistUserId
          AND food_id = :foodId
      `,
      {
        nutritionistUserId,
        foodId
      }
    );

    return result.affectedRows > 0;
  }

  async blockSubstitution(
    nutritionistUserId: number,
    referenceFoodId: number,
    blockedFoodId: number
  ): Promise<NutritionistBlockedSubstitution> {
    await this.db.query<ResultSetHeader>(
      `
        INSERT INTO nutritionist_blocked_substitutions (
          nutritionist_user_id,
          reference_food_id,
          blocked_food_id
        ) VALUES (
          :nutritionistUserId,
          :referenceFoodId,
          :blockedFoodId
        )
        ON DUPLICATE KEY UPDATE
          updated_at = CURRENT_TIMESTAMP
      `,
      {
        nutritionistUserId,
        referenceFoodId,
        blockedFoodId
      }
    );

    const blockedSubstitution = await this.findBlockedSubstitution(
      nutritionistUserId,
      referenceFoodId,
      blockedFoodId
    );

    if (!blockedSubstitution) {
      throw new Error('Saved blocked substitution was not found');
    }

    return blockedSubstitution;
  }

  async deleteBlockedSubstitution(
    nutritionistUserId: number,
    referenceFoodId: number,
    blockedFoodId: number
  ): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM nutritionist_blocked_substitutions
        WHERE nutritionist_user_id = :nutritionistUserId
          AND reference_food_id = :referenceFoodId
          AND blocked_food_id = :blockedFoodId
      `,
      {
        nutritionistUserId,
        referenceFoodId,
        blockedFoodId
      }
    );

    return result.affectedRows > 0;
  }

  async foodExists(foodId: number): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM foods
        WHERE id = :foodId
        LIMIT 1
      `,
      { foodId }
    );

    return rows.length > 0;
  }

  private async findFoodPreference(
    nutritionistUserId: number,
    foodId: number
  ): Promise<NutritionistFoodPreference | null> {
    const [rows] = await this.db.query<FoodPreferenceRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          food_id AS foodId,
          preference_type AS preferenceType,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM nutritionist_food_preferences
        WHERE nutritionist_user_id = :nutritionistUserId
          AND food_id = :foodId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        foodId
      }
    );

    return rows[0] ? toFoodPreference(rows[0]) : null;
  }

  private async findBlockedSubstitution(
    nutritionistUserId: number,
    referenceFoodId: number,
    blockedFoodId: number
  ): Promise<NutritionistBlockedSubstitution | null> {
    const [rows] = await this.db.query<BlockedSubstitutionRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          reference_food_id AS referenceFoodId,
          blocked_food_id AS blockedFoodId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM nutritionist_blocked_substitutions
        WHERE nutritionist_user_id = :nutritionistUserId
          AND reference_food_id = :referenceFoodId
          AND blocked_food_id = :blockedFoodId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        referenceFoodId,
        blockedFoodId
      }
    );

    return rows[0] ? toBlockedSubstitution(rows[0]) : null;
  }
}

function toFoodPreference(row: FoodPreferenceRow): NutritionistFoodPreference {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    foodId: row.foodId,
    preferenceType: row.preferenceType,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt)
  };
}

function toBlockedSubstitution(row: BlockedSubstitutionRow): NutritionistBlockedSubstitution {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    referenceFoodId: row.referenceFoodId,
    blockedFoodId: row.blockedFoodId,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt)
  };
}

function toIsoString(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}
