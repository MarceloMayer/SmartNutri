import type { Pool, RowDataPacket } from 'mysql2/promise';

import type { FoodAlias, FoodAliasesQuery } from './food-aliases.types';

type FoodAliasRow = RowDataPacket & FoodAlias;

export class FoodAliasesRepository {
  constructor(private readonly db: Pool) {}

  async list(query: FoodAliasesQuery): Promise<FoodAlias[]> {
    const foodId = query.foodId ?? null;
    const term = query.q?.trim() ?? '';
    const limit = query.limit ?? 10;

    const [rows] = await this.db.query<FoodAliasRow[]>(
      `
        SELECT
          id,
          food_id AS foodId,
          alias
        FROM food_aliases
        WHERE (:foodId IS NULL OR food_id = :foodId)
          AND (:term = '' OR alias LIKE CONCAT('%', :term, '%'))
        ORDER BY alias ASC
        LIMIT :limit
      `,
      { foodId, term, limit }
    );

    return rows;
  }
}
