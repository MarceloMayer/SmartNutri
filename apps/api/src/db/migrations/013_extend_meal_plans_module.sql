ALTER TABLE meal_plans
  ADD COLUMN nutritionist_user_id BIGINT UNSIGNED NULL AFTER id,
  MODIFY COLUMN patient_id BIGINT UNSIGNED NULL,
  ADD COLUMN objective VARCHAR(255) NULL AFTER title,
  ADD COLUMN status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft' AFTER description,
  ADD COLUMN total_kcal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN total_carbs DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_kcal,
  ADD COLUMN total_protein DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_carbs,
  ADD COLUMN total_fat DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_protein,
  ADD COLUMN total_fiber DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_fat;

UPDATE meal_plans
INNER JOIN patients
  ON patients.id = meal_plans.patient_id
SET
  meal_plans.nutritionist_user_id = patients.nutritionist_user_id,
  meal_plans.status = CASE
    WHEN meal_plans.is_active = 1 THEN 'active'
    ELSE 'draft'
  END;

ALTER TABLE meal_plans
  MODIFY COLUMN nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  ADD KEY meal_plans_nutritionist_user_id_index (nutritionist_user_id),
  ADD KEY meal_plans_status_index (status),
  ADD CONSTRAINT meal_plans_nutritionist_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE;

ALTER TABLE meal_plan_meals
  ADD COLUMN time_label VARCHAR(40) NULL AFTER name,
  ADD COLUMN total_kcal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER order_index,
  ADD COLUMN total_carbs DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_kcal,
  ADD COLUMN total_protein DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_carbs,
  ADD COLUMN total_fat DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_protein,
  ADD COLUMN total_fiber DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_fat;

ALTER TABLE meal_plan_items
  ADD COLUMN kcal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER unit,
  ADD COLUMN carbs DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER kcal,
  ADD COLUMN protein DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER carbs,
  ADD COLUMN fat DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER protein,
  ADD COLUMN fiber DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER fat;

UPDATE meal_plan_items
INNER JOIN foods
  ON foods.id = meal_plan_items.food_id
SET
  meal_plan_items.kcal = ROUND(COALESCE(foods.kcal_per_100g, 0) * meal_plan_items.quantity / 100, 2),
  meal_plan_items.carbs = ROUND(COALESCE(foods.carbs_per_100g, 0) * meal_plan_items.quantity / 100, 2),
  meal_plan_items.protein = ROUND(COALESCE(foods.protein_per_100g, 0) * meal_plan_items.quantity / 100, 2),
  meal_plan_items.fat = ROUND(COALESCE(foods.fat_per_100g, 0) * meal_plan_items.quantity / 100, 2),
  meal_plan_items.fiber = ROUND(COALESCE(foods.fiber_per_100g, 0) * meal_plan_items.quantity / 100, 2);

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
  GROUP BY meal_plan_meal_id
) AS item_totals
  ON item_totals.meal_plan_meal_id = meal_plan_meals.id
SET
  meal_plan_meals.total_kcal = COALESCE(item_totals.total_kcal, 0),
  meal_plan_meals.total_carbs = COALESCE(item_totals.total_carbs, 0),
  meal_plan_meals.total_protein = COALESCE(item_totals.total_protein, 0),
  meal_plan_meals.total_fat = COALESCE(item_totals.total_fat, 0),
  meal_plan_meals.total_fiber = COALESCE(item_totals.total_fiber, 0);

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
  GROUP BY meal_plan_id
) AS meal_totals
  ON meal_totals.meal_plan_id = meal_plans.id
SET
  meal_plans.total_kcal = COALESCE(meal_totals.total_kcal, 0),
  meal_plans.total_carbs = COALESCE(meal_totals.total_carbs, 0),
  meal_plans.total_protein = COALESCE(meal_totals.total_protein, 0),
  meal_plans.total_fat = COALESCE(meal_totals.total_fat, 0),
  meal_plans.total_fiber = COALESCE(meal_totals.total_fiber, 0);
