import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type {
  CreateSubstitutionGroupBody,
  SubstitutionGroup,
  SubstitutionGroupFood,
  UpdateSubstitutionGroupBody
} from './substitution-groups.types';

type SubstitutionGroupRow = RowDataPacket & Omit<SubstitutionGroup, 'isActive'> & {
  isActive: number | boolean;
};
type SubstitutionGroupFoodRow = RowDataPacket & SubstitutionGroupFood;

export class SubstitutionGroupsRepository {
  constructor(private readonly db: Pool) {}

  async list(): Promise<SubstitutionGroup[]> {
    const [rows] = await this.db.query<SubstitutionGroupRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          description,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM substitution_groups
        ORDER BY name ASC
      `
    );

    return rows.map(toSubstitutionGroup);
  }

  async findById(id: number): Promise<SubstitutionGroup | null> {
    const [rows] = await this.db.query<SubstitutionGroupRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          description,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM substitution_groups
        WHERE id = :id
        LIMIT 1
      `,
      { id }
    );

    return rows[0] ? toSubstitutionGroup(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<SubstitutionGroup | null> {
    const [rows] = await this.db.query<SubstitutionGroupRow[]>(
      `
        SELECT
          id,
          name,
          slug,
          description,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM substitution_groups
        WHERE slug = :slug
        LIMIT 1
      `,
      { slug }
    );

    return rows[0] ? toSubstitutionGroup(rows[0]) : null;
  }

  async create(input: CreateSubstitutionGroupBody & { slug: string }): Promise<SubstitutionGroup> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO substitution_groups (
          name,
          slug,
          description,
          is_active
        ) VALUES (
          :name,
          :slug,
          :description,
          :isActive
        )
      `,
      {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        isActive: input.isActive ?? true
      }
    );

    const group = await this.findById(result.insertId);

    if (!group) {
      throw new Error('Created substitution group was not found');
    }

    return group;
  }

  async update(
    id: number,
    input: UpdateSubstitutionGroupBody & { slug: string }
  ): Promise<SubstitutionGroup | null> {
    await this.db.query<ResultSetHeader>(
      `
        UPDATE substitution_groups
        SET
          name = :name,
          slug = :slug,
          description = :description
        WHERE id = :id
      `,
      {
        id,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null
      }
    );

    return this.findById(id);
  }

  async updateStatus(id: number, isActive: boolean): Promise<SubstitutionGroup | null> {
    await this.db.query<ResultSetHeader>(
      `
        UPDATE substitution_groups
        SET is_active = :isActive
        WHERE id = :id
      `,
      {
        id,
        isActive
      }
    );

    return this.findById(id);
  }

  async findFoodsByGroupId(id: number): Promise<SubstitutionGroupFood[]> {
    const [rows] = await this.db.query<SubstitutionGroupFoodRow[]>(
      `
        SELECT
          foods.id,
          foods.name,
          foods.slug,
          foods.taco_code AS tacoCode,
          foods.source,
          foods.kcal_per_100g AS kcalPer100g,
          foods.carbs_per_100g AS carbsPer100g,
          foods.protein_per_100g AS proteinPer100g,
          foods.fat_per_100g AS fatPer100g,
          foods.fiber_per_100g AS fiberPer100g
        FROM food_substitution_groups
        INNER JOIN foods
          ON foods.id = food_substitution_groups.food_id
        WHERE food_substitution_groups.substitution_group_id = :id
        ORDER BY foods.name ASC
      `,
      { id }
    );

    return rows;
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

  async foodIsLinkedToGroup(groupId: number, foodId: number): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM food_substitution_groups
        WHERE substitution_group_id = :groupId
          AND food_id = :foodId
        LIMIT 1
      `,
      {
        groupId,
        foodId
      }
    );

    return rows.length > 0;
  }

  async addFoodToGroup(groupId: number, foodId: number): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `
        INSERT INTO food_substitution_groups (
          food_id,
          substitution_group_id
        ) VALUES (
          :foodId,
          :groupId
        )
      `,
      {
        groupId,
        foodId
      }
    );
  }

  async removeFoodFromGroup(groupId: number, foodId: number): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM food_substitution_groups
        WHERE substitution_group_id = :groupId
          AND food_id = :foodId
      `,
      {
        groupId,
        foodId
      }
    );

    return result.affectedRows > 0;
  }
}

function toSubstitutionGroup(row: SubstitutionGroupRow): SubstitutionGroup {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
