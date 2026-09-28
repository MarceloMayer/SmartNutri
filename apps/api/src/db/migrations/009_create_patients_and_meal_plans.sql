CREATE TABLE IF NOT EXISTS patients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY patients_nutritionist_user_id_index (nutritionist_user_id),
  KEY patients_name_index (name),
  KEY patients_email_index (email),
  CONSTRAINT patients_nutritionist_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meal_plans_patient_id_index (patient_id),
  KEY meal_plans_is_active_index (is_active),
  CONSTRAINT meal_plans_patient_id_foreign
    FOREIGN KEY (patient_id)
    REFERENCES patients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meal_plan_meals_meal_plan_id_index (meal_plan_id),
  KEY meal_plan_meals_order_index_index (order_index),
  CONSTRAINT meal_plan_meals_meal_plan_id_foreign
    FOREIGN KEY (meal_plan_id)
    REFERENCES meal_plans (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_meal_id BIGINT UNSIGNED NOT NULL,
  food_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(10,2) UNSIGNED NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'g',
  notes TEXT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meal_plan_items_meal_plan_meal_id_index (meal_plan_meal_id),
  KEY meal_plan_items_food_id_index (food_id),
  KEY meal_plan_items_order_index_index (order_index),
  CONSTRAINT meal_plan_items_meal_plan_meal_id_foreign
    FOREIGN KEY (meal_plan_meal_id)
    REFERENCES meal_plan_meals (id)
    ON DELETE CASCADE,
  CONSTRAINT meal_plan_items_food_id_foreign
    FOREIGN KEY (food_id)
    REFERENCES foods (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
