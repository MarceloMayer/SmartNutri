CREATE TABLE IF NOT EXISTS nutritionist_food_preferences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  food_id BIGINT UNSIGNED NOT NULL,
  preference_type ENUM('favorite', 'avoid') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY nutritionist_food_preferences_unique (nutritionist_user_id, food_id),
  KEY nutritionist_food_preferences_food_id_index (food_id),
  KEY nutritionist_food_preferences_type_index (preference_type),
  CONSTRAINT nutritionist_food_preferences_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT nutritionist_food_preferences_food_id_foreign
    FOREIGN KEY (food_id)
    REFERENCES foods (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nutritionist_blocked_substitutions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  reference_food_id BIGINT UNSIGNED NOT NULL,
  blocked_food_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY nutritionist_blocked_substitutions_unique (
    nutritionist_user_id,
    reference_food_id,
    blocked_food_id
  ),
  KEY nutritionist_blocked_substitutions_reference_index (reference_food_id),
  KEY nutritionist_blocked_substitutions_blocked_index (blocked_food_id),
  CONSTRAINT nutritionist_blocked_substitutions_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT nutritionist_blocked_substitutions_reference_food_id_foreign
    FOREIGN KEY (reference_food_id)
    REFERENCES foods (id)
    ON DELETE CASCADE,
  CONSTRAINT nutritionist_blocked_substitutions_blocked_food_id_foreign
    FOREIGN KEY (blocked_food_id)
    REFERENCES foods (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
