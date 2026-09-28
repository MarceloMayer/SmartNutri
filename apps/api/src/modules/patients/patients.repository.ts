import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type {
  CreateMealBody,
  CreateMealPlanBody,
  CreateMealPlanItemBody,
  CreatePatientBody,
  FoodNutrition,
  MealPlan,
  MealPlanDetail,
  MealPlanItem,
  MealPlanMeal,
  MealPlanMealWithItems,
  MealPlanStatus,
  Patient,
  UpdateMealBody,
  UpdateMealPlanBody,
  UpdateMealPlanItemBody,
  UpdatePatientBody
} from './patients.types';

type TimestampValue = Date | string;
type PatientRow = RowDataPacket & Omit<Patient, 'createdAt' | 'updatedAt' | 'birthDate'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
  birthDate: string | Date | null;
};
type MealPlanRow = RowDataPacket & Omit<MealPlan, 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};
type MealPlanMealRow = RowDataPacket & Omit<MealPlanMeal, 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};
type MealPlanItemRow = RowDataPacket & Omit<MealPlanItem, 'food' | 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};
type FoodNutritionRow = RowDataPacket & FoodNutrition;
type MealPlanIdRow = RowDataPacket & {
  mealPlanId: number;
};

interface FoodNutrients {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

export class PatientsRepository {
  constructor(private readonly db: Pool) {}

  async listPatients(nutritionistUserId: number): Promise<Patient[]> {
    const [rows] = await this.db.query<PatientRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_user_id AS patientUserId,
          name,
          email,
          phone,
          notes,
          birth_date AS birthDate,
          sex,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM patients
        WHERE nutritionist_user_id = :nutritionistUserId
        ORDER BY name ASC
      `,
      { nutritionistUserId }
    );

    return rows.map(toPatient);
  }

  async createPatient(
    nutritionistUserId: number,
    input: CreatePatientBody
  ): Promise<Patient> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO patients (
          nutritionist_user_id,
          patient_user_id,
          name,
          email,
          phone,
          notes,
          birth_date,
          sex
        ) VALUES (
          :nutritionistUserId,
          NULL,
          :name,
          :email,
          :phone,
          :notes,
          :birthDate,
          :sex
        )
      `,
      {
        nutritionistUserId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        birthDate: input.birthDate ?? null,
        sex: input.sex ?? null
      }
    );

    const patient = await this.findPatientById(nutritionistUserId, result.insertId);

    if (!patient) {
      throw new Error('Created patient was not found');
    }

    return patient;
  }

  async createPatientWithUser(
    nutritionistUserId: number,
    input: CreatePatientBody & { email: string; passwordHash: string }
  ): Promise<Patient> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO users (
            name,
            email,
            password_hash,
            role
          ) VALUES (
            :name,
            :email,
            :passwordHash,
            'patient'
          )
        `,
        {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash
        }
      );

      const [patientResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO patients (
            nutritionist_user_id,
            patient_user_id,
            name,
            email,
            phone,
            notes
          ) VALUES (
            :nutritionistUserId,
            :patientUserId,
            :name,
            :email,
            :phone,
            :notes
          )
        `,
        {
          nutritionistUserId,
          patientUserId: userResult.insertId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          notes: input.notes ?? null
        }
      );

      await connection.commit();

      const patient = await this.findPatientById(nutritionistUserId, patientResult.insertId);

      if (!patient) {
        throw new Error('Created patient was not found');
      }

      return patient;
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  async userExistsByEmail(email: string): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM users
        WHERE email = :email
        LIMIT 1
      `,
      { email }
    );

    return rows.length > 0;
  }

  async findPatientById(
    nutritionistUserId: number,
    patientId: number
  ): Promise<Patient | null> {
    const [rows] = await this.db.query<PatientRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_user_id AS patientUserId,
          name,
          email,
          phone,
          notes,
          birth_date AS birthDate,
          sex,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM patients
        WHERE id = :patientId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        patientId
      }
    );

    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findPatientByUserId(patientUserId: number): Promise<Patient | null> {
    const [rows] = await this.db.query<PatientRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_user_id AS patientUserId,
          name,
          email,
          phone,
          notes,
          birth_date AS birthDate,
          sex,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM patients
        WHERE patient_user_id = :patientUserId
        LIMIT 1
      `,
      { patientUserId }
    );

    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findDietByPatientUserId(patientUserId: number): Promise<{
    patient: Patient;
    mealPlan: MealPlanDetail | null;
  } | null> {
    const patient = await this.findPatientByUserId(patientUserId);

    if (!patient) {
      return null;
    }

    const [rows] = await this.db.query<MealPlanRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_id AS patientId,
          title,
          objective,
          description,
          status,
          status = 'active' AS isActive,
          total_kcal AS totalKcal,
          total_carbs AS totalCarbs,
          total_protein AS totalProtein,
          total_fat AS totalFat,
          total_fiber AS totalFiber,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meal_plans
        WHERE patient_id = :patientId
          AND nutritionist_user_id = :nutritionistUserId
          AND status = 'active'
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `,
      {
        patientId: patient.id,
        nutritionistUserId: patient.nutritionistUserId
      }
    );

    const mealPlan = rows[0]
      ? await this.findMealPlanDetailById(patient.nutritionistUserId, rows[0].id)
      : null;

    return {
      patient,
      mealPlan
    };
  }

  async updatePatient(
    nutritionistUserId: number,
    patientId: number,
    input: UpdatePatientBody
  ): Promise<Patient | null> {
    const updates: string[] = [];
    const params: Record<string, string | number | null> = {
      nutritionistUserId,
      patientId
    };

    if (input.name !== undefined) {
      updates.push('name = :name');
      params.name = input.name;
    }

    if (input.email !== undefined) {
      updates.push('email = :email');
      params.email = input.email ?? null;
    }

    if (input.phone !== undefined) {
      updates.push('phone = :phone');
      params.phone = input.phone ?? null;
    }

    if (input.notes !== undefined) {
      updates.push('notes = :notes');
      params.notes = input.notes ?? null;
    }

    if (input.birthDate !== undefined) {
      updates.push('birth_date = :birthDate');
      params.birthDate = input.birthDate ?? null;
    }

    if (input.sex !== undefined) {
      updates.push('sex = :sex');
      params.sex = input.sex ?? null;
    }

    if (updates.length > 0) {
      await this.db.query<ResultSetHeader>(
        `
          UPDATE patients
          SET ${updates.join(', ')}
          WHERE id = :patientId
            AND nutritionist_user_id = :nutritionistUserId
        `,
        params
      );
    }

    return this.findPatientById(nutritionistUserId, patientId);
  }

  async deletePatient(nutritionistUserId: number, patientId: number): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM patients
        WHERE id = :patientId
          AND nutritionist_user_id = :nutritionistUserId
      `,
      {
        nutritionistUserId,
        patientId
      }
    );

    return result.affectedRows > 0;
  }

  async listMealPlans(
    nutritionistUserId: number,
    patientId: number | null = null
  ): Promise<MealPlan[]> {
    const [rows] = await this.db.query<MealPlanRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_id AS patientId,
          title,
          objective,
          description,
          status,
          status = 'active' AS isActive,
          total_kcal AS totalKcal,
          total_carbs AS totalCarbs,
          total_protein AS totalProtein,
          total_fat AS totalFat,
          total_fiber AS totalFiber,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meal_plans
        WHERE nutritionist_user_id = :nutritionistUserId
          AND (:patientId IS NULL OR patient_id = :patientId)
        ORDER BY FIELD(status, 'active', 'draft', 'archived'), created_at DESC
      `,
      {
        nutritionistUserId,
        patientId
      }
    );

    return rows.map(toMealPlan);
  }

  async createMealPlan(
    nutritionistUserId: number,
    input: CreateMealPlanBody
  ): Promise<MealPlan> {
    const status = resolveStatus(input.status, input.isActive);
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO meal_plans (
          nutritionist_user_id,
          patient_id,
          title,
          objective,
          description,
          status,
          is_active
        ) VALUES (
          :nutritionistUserId,
          :patientId,
          :title,
          :objective,
          :description,
          :status,
          :isActive
        )
      `,
      {
        nutritionistUserId,
        patientId: input.patientId ?? null,
        title: input.title,
        objective: input.objective ?? null,
        description: input.description ?? null,
        status,
        isActive: status === 'active'
      }
    );

    const mealPlan = await this.findMealPlanById(nutritionistUserId, result.insertId);

    if (!mealPlan) {
      throw new Error('Created meal plan was not found');
    }

    return mealPlan;
  }

  async findMealPlanById(
    nutritionistUserId: number,
    mealPlanId: number
  ): Promise<MealPlan | null> {
    const [rows] = await this.db.query<MealPlanRow[]>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          patient_id AS patientId,
          title,
          objective,
          description,
          status,
          status = 'active' AS isActive,
          total_kcal AS totalKcal,
          total_carbs AS totalCarbs,
          total_protein AS totalProtein,
          total_fat AS totalFat,
          total_fiber AS totalFiber,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meal_plans
        WHERE id = :mealPlanId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        mealPlanId
      }
    );

    return rows[0] ? toMealPlan(rows[0]) : null;
  }

  async findMealPlanDetailById(
    nutritionistUserId: number,
    mealPlanId: number
  ): Promise<MealPlanDetail | null> {
    const mealPlan = await this.findMealPlanById(nutritionistUserId, mealPlanId);

    if (!mealPlan) {
      return null;
    }

    const patient = mealPlan.patientId
      ? await this.findPatientById(nutritionistUserId, mealPlan.patientId)
      : null;
    const meals = await this.listMeals(nutritionistUserId, mealPlan.id);
    const itemsByMealId = await this.findItemsByMealIds(
      nutritionistUserId,
      meals.map((meal) => meal.id)
    );

    return {
      ...mealPlan,
      patient,
      meals: meals.map((meal): MealPlanMealWithItems => ({
        ...meal,
        items: itemsByMealId.get(meal.id) ?? []
      }))
    };
  }

  async updateMealPlan(
    nutritionistUserId: number,
    mealPlanId: number,
    input: UpdateMealPlanBody
  ): Promise<MealPlan | null> {
    const updates: string[] = [];
    const params: Record<string, string | number | boolean | null> = {
      nutritionistUserId,
      mealPlanId
    };

    if (input.patientId !== undefined) {
      updates.push('patient_id = :patientId');
      params.patientId = input.patientId ?? null;
    }

    if (input.title !== undefined) {
      updates.push('title = :title');
      params.title = input.title;
    }

    if (input.objective !== undefined) {
      updates.push('objective = :objective');
      params.objective = input.objective ?? null;
    }

    if (input.description !== undefined) {
      updates.push('description = :description');
      params.description = input.description ?? null;
    }

    if (input.status !== undefined || input.isActive !== undefined) {
      const status = resolveStatus(input.status, input.isActive);
      updates.push('status = :status', 'is_active = :isActive');
      params.status = status;
      params.isActive = status === 'active';
    }

    if (updates.length > 0) {
      await this.db.query<ResultSetHeader>(
        `
          UPDATE meal_plans
          SET ${updates.join(', ')}
          WHERE id = :mealPlanId
            AND nutritionist_user_id = :nutritionistUserId
        `,
        params
      );
    }

    return this.findMealPlanById(nutritionistUserId, mealPlanId);
  }

  async deleteMealPlan(nutritionistUserId: number, mealPlanId: number): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM meal_plans
        WHERE id = :mealPlanId
          AND nutritionist_user_id = :nutritionistUserId
      `,
      {
        nutritionistUserId,
        mealPlanId
      }
    );

    return result.affectedRows > 0;
  }

  async listMeals(nutritionistUserId: number, mealPlanId: number): Promise<MealPlanMeal[]> {
    const [rows] = await this.db.query<MealPlanMealRow[]>(
      `
        SELECT
          meal_plan_meals.id,
          meal_plan_meals.meal_plan_id AS mealPlanId,
          meal_plan_meals.name,
          meal_plan_meals.time_label AS timeLabel,
          meal_plan_meals.order_index AS orderIndex,
          meal_plan_meals.total_kcal AS totalKcal,
          meal_plan_meals.total_carbs AS totalCarbs,
          meal_plan_meals.total_protein AS totalProtein,
          meal_plan_meals.total_fat AS totalFat,
          meal_plan_meals.total_fiber AS totalFiber,
          meal_plan_meals.created_at AS createdAt,
          meal_plan_meals.updated_at AS updatedAt
        FROM meal_plan_meals
        INNER JOIN meal_plans
          ON meal_plans.id = meal_plan_meals.meal_plan_id
        WHERE meal_plan_meals.meal_plan_id = :mealPlanId
          AND meal_plans.nutritionist_user_id = :nutritionistUserId
        ORDER BY meal_plan_meals.order_index ASC, meal_plan_meals.id ASC
      `,
      {
        nutritionistUserId,
        mealPlanId
      }
    );

    return rows.map(toMeal);
  }

  async createMeal(mealPlanId: number, input: CreateMealBody): Promise<MealPlanMeal> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO meal_plan_meals (
          meal_plan_id,
          name,
          time_label,
          order_index
        ) VALUES (
          :mealPlanId,
          :name,
          :timeLabel,
          :orderIndex
        )
      `,
      {
        mealPlanId,
        name: input.name,
        timeLabel: input.timeLabel ?? null,
        orderIndex: input.orderIndex ?? 0
      }
    );

    const meal = await this.findMealByIdWithoutOwnership(result.insertId);

    if (!meal) {
      throw new Error('Created meal was not found');
    }

    return meal;
  }

  async findMealById(nutritionistUserId: number, mealId: number): Promise<MealPlanMeal | null> {
    const [rows] = await this.db.query<MealPlanMealRow[]>(
      `
        SELECT
          meal_plan_meals.id,
          meal_plan_meals.meal_plan_id AS mealPlanId,
          meal_plan_meals.name,
          meal_plan_meals.time_label AS timeLabel,
          meal_plan_meals.order_index AS orderIndex,
          meal_plan_meals.total_kcal AS totalKcal,
          meal_plan_meals.total_carbs AS totalCarbs,
          meal_plan_meals.total_protein AS totalProtein,
          meal_plan_meals.total_fat AS totalFat,
          meal_plan_meals.total_fiber AS totalFiber,
          meal_plan_meals.created_at AS createdAt,
          meal_plan_meals.updated_at AS updatedAt
        FROM meal_plan_meals
        INNER JOIN meal_plans
          ON meal_plans.id = meal_plan_meals.meal_plan_id
        WHERE meal_plan_meals.id = :mealId
          AND meal_plans.nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        mealId
      }
    );

    return rows[0] ? toMeal(rows[0]) : null;
  }

  async updateMeal(
    nutritionistUserId: number,
    mealId: number,
    input: UpdateMealBody
  ): Promise<MealPlanMeal | null> {
    const updates: string[] = [];
    const params: Record<string, string | number | null> = {
      nutritionistUserId,
      mealId
    };

    if (input.name !== undefined) {
      updates.push('meal_plan_meals.name = :name');
      params.name = input.name;
    }

    if (input.timeLabel !== undefined) {
      updates.push('meal_plan_meals.time_label = :timeLabel');
      params.timeLabel = input.timeLabel ?? null;
    }

    if (input.orderIndex !== undefined) {
      updates.push('meal_plan_meals.order_index = :orderIndex');
      params.orderIndex = input.orderIndex;
    }

    if (updates.length > 0) {
      await this.db.query<ResultSetHeader>(
        `
          UPDATE meal_plan_meals
          INNER JOIN meal_plans
            ON meal_plans.id = meal_plan_meals.meal_plan_id
          SET ${updates.join(', ')}
          WHERE meal_plan_meals.id = :mealId
            AND meal_plans.nutritionist_user_id = :nutritionistUserId
        `,
        params
      );
    }

    return this.findMealById(nutritionistUserId, mealId);
  }

  async deleteMeal(nutritionistUserId: number, mealId: number): Promise<boolean> {
    const meal = await this.findMealById(nutritionistUserId, mealId);

    if (!meal) {
      return false;
    }

    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM meal_plan_meals
        WHERE id = :mealId
      `,
      { mealId }
    );

    if (result.affectedRows > 0) {
      await this.recalculatePlan(meal.mealPlanId);
    }

    return result.affectedRows > 0;
  }

  async listItems(nutritionistUserId: number, mealId: number): Promise<MealPlanItem[]> {
    const itemsByMealId = await this.findItemsByMealIds(nutritionistUserId, [mealId]);

    return itemsByMealId.get(mealId) ?? [];
  }

  async createItem(mealId: number, input: CreateMealPlanItemBody): Promise<MealPlanItem | null> {
    const food = await this.findFoodNutrition(input.foodId);

    if (!food) {
      return null;
    }

    const nutrients = calculateFoodNutrients(food, input.quantity);
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO meal_plan_items (
          meal_plan_meal_id,
          food_id,
          quantity,
          unit,
          kcal,
          carbs,
          protein,
          fat,
          fiber,
          notes,
          order_index
        ) VALUES (
          :mealId,
          :foodId,
          :quantity,
          :unit,
          :kcal,
          :carbs,
          :protein,
          :fat,
          :fiber,
          :notes,
          :orderIndex
        )
      `,
      {
        mealId,
        foodId: input.foodId,
        quantity: input.quantity,
        unit: input.unit ?? 'g',
        kcal: nutrients.kcal,
        carbs: nutrients.carbs,
        protein: nutrients.protein,
        fat: nutrients.fat,
        fiber: nutrients.fiber,
        notes: input.notes ?? null,
        orderIndex: input.orderIndex ?? 0
      }
    );

    await this.recalculateMealAndPlan(mealId);

    const item = await this.findItemByIdWithoutOwnership(result.insertId);

    if (!item) {
      throw new Error('Created meal plan item was not found');
    }

    return item;
  }

  async findItemById(
    nutritionistUserId: number,
    itemId: number
  ): Promise<MealPlanItem | null> {
    const [rows] = await this.db.query<MealPlanItemRow[]>(
      `
        SELECT
          meal_plan_items.id,
          meal_plan_items.meal_plan_meal_id AS mealPlanMealId,
          meal_plan_items.food_id AS foodId,
          foods.name AS foodName,
          foods.slug AS foodSlug,
          meal_plan_items.quantity,
          meal_plan_items.unit,
          meal_plan_items.kcal,
          meal_plan_items.carbs,
          meal_plan_items.protein,
          meal_plan_items.fat,
          meal_plan_items.fiber,
          meal_plan_items.notes,
          meal_plan_items.order_index AS orderIndex,
          meal_plan_items.created_at AS createdAt,
          meal_plan_items.updated_at AS updatedAt
        FROM meal_plan_items
        INNER JOIN foods
          ON foods.id = meal_plan_items.food_id
        INNER JOIN meal_plan_meals
          ON meal_plan_meals.id = meal_plan_items.meal_plan_meal_id
        INNER JOIN meal_plans
          ON meal_plans.id = meal_plan_meals.meal_plan_id
        WHERE meal_plan_items.id = :itemId
          AND meal_plans.nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        nutritionistUserId,
        itemId
      }
    );

    return rows[0] ? toItem(rows[0]) : null;
  }

  async updateItem(
    nutritionistUserId: number,
    itemId: number,
    input: UpdateMealPlanItemBody
  ): Promise<MealPlanItem | null> {
    const existingItem = await this.findItemById(nutritionistUserId, itemId);

    if (!existingItem) {
      return null;
    }

    const foodId = input.foodId ?? existingItem.foodId;
    const quantity = input.quantity ?? existingItem.quantity;
    const food = await this.findFoodNutrition(foodId);

    if (!food) {
      return null;
    }

    const nutrients = calculateFoodNutrients(food, quantity);
    const updates = [
      'food_id = :foodId',
      'quantity = :quantity',
      'kcal = :kcal',
      'carbs = :carbs',
      'protein = :protein',
      'fat = :fat',
      'fiber = :fiber'
    ];
    const params: Record<string, string | number | null> = {
      itemId,
      foodId,
      quantity,
      kcal: nutrients.kcal,
      carbs: nutrients.carbs,
      protein: nutrients.protein,
      fat: nutrients.fat,
      fiber: nutrients.fiber
    };

    if (input.unit !== undefined) {
      updates.push('unit = :unit');
      params.unit = input.unit;
    }

    if (input.notes !== undefined) {
      updates.push('notes = :notes');
      params.notes = input.notes ?? null;
    }

    if (input.orderIndex !== undefined) {
      updates.push('order_index = :orderIndex');
      params.orderIndex = input.orderIndex;
    }

    await this.db.query<ResultSetHeader>(
      `
        UPDATE meal_plan_items
        SET ${updates.join(', ')}
        WHERE id = :itemId
      `,
      params
    );

    await this.recalculateMealAndPlan(existingItem.mealPlanMealId);

    return this.findItemById(nutritionistUserId, itemId);
  }

  async deleteItem(nutritionistUserId: number, itemId: number): Promise<boolean> {
    const item = await this.findItemById(nutritionistUserId, itemId);

    if (!item) {
      return false;
    }

    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM meal_plan_items
        WHERE id = :itemId
      `,
      { itemId }
    );

    if (result.affectedRows > 0) {
      await this.recalculateMealAndPlan(item.mealPlanMealId);
    }

    return result.affectedRows > 0;
  }

  async recalculatePlanWithMeals(
    nutritionistUserId: number,
    mealPlanId: number
  ): Promise<MealPlanDetail | null> {
    const mealPlan = await this.findMealPlanById(nutritionistUserId, mealPlanId);

    if (!mealPlan) {
      return null;
    }

    const meals = await this.listMeals(nutritionistUserId, mealPlanId);

    for (const meal of meals) {
      await this.recalculateMeal(meal.id);
    }

    await this.recalculatePlan(mealPlanId);

    return this.findMealPlanDetailById(nutritionistUserId, mealPlanId);
  }

  async foodExists(foodId: number): Promise<boolean> {
    return Boolean(await this.findFoodNutrition(foodId));
  }

  async findFoodNutrition(foodId: number): Promise<FoodNutrition | null> {
    const [rows] = await this.db.query<FoodNutritionRow[]>(
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

  private async findMealByIdWithoutOwnership(mealId: number): Promise<MealPlanMeal | null> {
    const [rows] = await this.db.query<MealPlanMealRow[]>(
      `
        SELECT
          id,
          meal_plan_id AS mealPlanId,
          name,
          time_label AS timeLabel,
          order_index AS orderIndex,
          total_kcal AS totalKcal,
          total_carbs AS totalCarbs,
          total_protein AS totalProtein,
          total_fat AS totalFat,
          total_fiber AS totalFiber,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meal_plan_meals
        WHERE id = :mealId
        LIMIT 1
      `,
      { mealId }
    );

    return rows[0] ? toMeal(rows[0]) : null;
  }

  private async findItemByIdWithoutOwnership(itemId: number): Promise<MealPlanItem | null> {
    const [rows] = await this.db.query<MealPlanItemRow[]>(
      `
        SELECT
          meal_plan_items.id,
          meal_plan_items.meal_plan_meal_id AS mealPlanMealId,
          meal_plan_items.food_id AS foodId,
          foods.name AS foodName,
          foods.slug AS foodSlug,
          meal_plan_items.quantity,
          meal_plan_items.unit,
          meal_plan_items.kcal,
          meal_plan_items.carbs,
          meal_plan_items.protein,
          meal_plan_items.fat,
          meal_plan_items.fiber,
          meal_plan_items.notes,
          meal_plan_items.order_index AS orderIndex,
          meal_plan_items.created_at AS createdAt,
          meal_plan_items.updated_at AS updatedAt
        FROM meal_plan_items
        INNER JOIN foods
          ON foods.id = meal_plan_items.food_id
        WHERE meal_plan_items.id = :itemId
        LIMIT 1
      `,
      { itemId }
    );

    return rows[0] ? toItem(rows[0]) : null;
  }

  private async findItemsByMealIds(
    nutritionistUserId: number,
    mealIds: number[]
  ): Promise<Map<number, MealPlanItem[]>> {
    if (mealIds.length === 0) {
      return new Map();
    }

    const placeholders = mealIds.map(() => '?').join(', ');
    const [rows] = await this.db.query<MealPlanItemRow[]>(
      `
        SELECT
          meal_plan_items.id,
          meal_plan_items.meal_plan_meal_id AS mealPlanMealId,
          meal_plan_items.food_id AS foodId,
          foods.name AS foodName,
          foods.slug AS foodSlug,
          meal_plan_items.quantity,
          meal_plan_items.unit,
          meal_plan_items.kcal,
          meal_plan_items.carbs,
          meal_plan_items.protein,
          meal_plan_items.fat,
          meal_plan_items.fiber,
          meal_plan_items.notes,
          meal_plan_items.order_index AS orderIndex,
          meal_plan_items.created_at AS createdAt,
          meal_plan_items.updated_at AS updatedAt
        FROM meal_plan_items
        INNER JOIN foods
          ON foods.id = meal_plan_items.food_id
        INNER JOIN meal_plan_meals
          ON meal_plan_meals.id = meal_plan_items.meal_plan_meal_id
        INNER JOIN meal_plans
          ON meal_plans.id = meal_plan_meals.meal_plan_id
        WHERE meal_plan_items.meal_plan_meal_id IN (${placeholders})
          AND meal_plans.nutritionist_user_id = ?
        ORDER BY meal_plan_items.order_index ASC, meal_plan_items.id ASC
      `,
      [...mealIds, nutritionistUserId]
    );

    return rows.reduce((itemsByMealId, row) => {
      const item = toItem(row);
      const mealItems = itemsByMealId.get(item.mealPlanMealId) ?? [];

      mealItems.push(item);
      itemsByMealId.set(item.mealPlanMealId, mealItems);

      return itemsByMealId;
    }, new Map<number, MealPlanItem[]>());
  }

  private async recalculateMealAndPlan(mealId: number): Promise<void> {
    const [rows] = await this.db.query<MealPlanIdRow[]>(
      `
        SELECT meal_plan_id AS mealPlanId
        FROM meal_plan_meals
        WHERE id = :mealId
        LIMIT 1
      `,
      { mealId }
    );

    if (!rows[0]) {
      return;
    }

    await this.recalculateMeal(mealId);
    await this.recalculatePlan(rows[0].mealPlanId);
  }

  private async recalculateMeal(mealId: number): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `
        UPDATE meal_plan_meals
        LEFT JOIN (
          SELECT
            meal_plan_meal_id,
            SUM(kcal) AS total_kcal,
            SUM(carbs) AS total_carbs,
            SUM(protein) AS total_protein,
            SUM(fat) AS total_fat,
            SUM(fiber) AS total_fiber
          FROM meal_plan_items
          WHERE meal_plan_meal_id = :mealId
          GROUP BY meal_plan_meal_id
        ) AS item_totals
          ON item_totals.meal_plan_meal_id = meal_plan_meals.id
        SET
          meal_plan_meals.total_kcal = COALESCE(item_totals.total_kcal, 0),
          meal_plan_meals.total_carbs = COALESCE(item_totals.total_carbs, 0),
          meal_plan_meals.total_protein = COALESCE(item_totals.total_protein, 0),
          meal_plan_meals.total_fat = COALESCE(item_totals.total_fat, 0),
          meal_plan_meals.total_fiber = COALESCE(item_totals.total_fiber, 0)
        WHERE meal_plan_meals.id = :mealId
      `,
      { mealId }
    );
  }

  private async recalculatePlan(mealPlanId: number): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `
        UPDATE meal_plans
        LEFT JOIN (
          SELECT
            meal_plan_id,
            SUM(total_kcal) AS total_kcal,
            SUM(total_carbs) AS total_carbs,
            SUM(total_protein) AS total_protein,
            SUM(total_fat) AS total_fat,
            SUM(total_fiber) AS total_fiber
          FROM meal_plan_meals
          WHERE meal_plan_id = :mealPlanId
          GROUP BY meal_plan_id
        ) AS meal_totals
          ON meal_totals.meal_plan_id = meal_plans.id
        SET
          meal_plans.total_kcal = COALESCE(meal_totals.total_kcal, 0),
          meal_plans.total_carbs = COALESCE(meal_totals.total_carbs, 0),
          meal_plans.total_protein = COALESCE(meal_totals.total_protein, 0),
          meal_plans.total_fat = COALESCE(meal_totals.total_fat, 0),
          meal_plans.total_fiber = COALESCE(meal_totals.total_fiber, 0)
        WHERE meal_plans.id = :mealPlanId
      `,
      { mealPlanId }
    );
  }
}

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    patientUserId: row.patientUserId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    birthDate: row.birthDate instanceof Date
      ? row.birthDate.toISOString().slice(0, 10)
      : (row.birthDate ?? null),
    sex: row.sex ?? null,
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function toMealPlan(row: MealPlanRow): MealPlan {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    patientId: row.patientId,
    title: row.title,
    objective: row.objective,
    description: row.description,
    status: row.status,
    isActive: Boolean(row.isActive),
    totalKcal: Number(row.totalKcal),
    totalCarbs: Number(row.totalCarbs),
    totalProtein: Number(row.totalProtein),
    totalFat: Number(row.totalFat),
    totalFiber: Number(row.totalFiber),
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function toMeal(row: MealPlanMealRow): MealPlanMeal {
  return {
    id: row.id,
    mealPlanId: row.mealPlanId,
    name: row.name,
    timeLabel: row.timeLabel,
    orderIndex: row.orderIndex,
    totalKcal: Number(row.totalKcal),
    totalCarbs: Number(row.totalCarbs),
    totalProtein: Number(row.totalProtein),
    totalFat: Number(row.totalFat),
    totalFiber: Number(row.totalFiber),
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function toItem(row: MealPlanItemRow): MealPlanItem {
  return {
    id: row.id,
    mealPlanMealId: row.mealPlanMealId,
    foodId: row.foodId,
    foodName: row.foodName,
    foodSlug: row.foodSlug,
    food: {
      id: row.foodId,
      name: row.foodName,
      slug: row.foodSlug
    },
    quantity: Number(row.quantity),
    unit: row.unit,
    kcal: Number(row.kcal),
    carbs: Number(row.carbs),
    protein: Number(row.protein),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
    notes: row.notes,
    orderIndex: row.orderIndex,
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function resolveStatus(
  status: MealPlanStatus | undefined,
  isActive: boolean | undefined
): MealPlanStatus {
  if (status) {
    return status;
  }

  if (isActive === true) {
    return 'active';
  }

  if (isActive === false) {
    return 'draft';
  }

  return 'draft';
}

function calculateFoodNutrients(food: FoodNutrition, quantity: number): FoodNutrients {
  return {
    kcal: calculateNutrient(food.kcalPer100g, quantity),
    carbs: calculateNutrient(food.carbsPer100g, quantity),
    protein: calculateNutrient(food.proteinPer100g, quantity),
    fat: calculateNutrient(food.fatPer100g, quantity),
    fiber: calculateNutrient(food.fiberPer100g, quantity)
  };
}

function calculateNutrient(valuePer100g: number | null, quantity: number): number {
  return roundToTwo(((valuePer100g ?? 0) * quantity) / 100);
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function serializeTimestamp(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // The original transaction error is more useful to callers.
  }
}
