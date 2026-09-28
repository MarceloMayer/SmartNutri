CREATE TABLE IF NOT EXISTS foods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  taco_code VARCHAR(40) NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'manual',
  kcal_per_100g DECIMAL(8,2) UNSIGNED NULL,
  carbs_per_100g DECIMAL(8,2) UNSIGNED NULL,
  protein_per_100g DECIMAL(8,2) UNSIGNED NULL,
  fat_per_100g DECIMAL(8,2) UNSIGNED NULL,
  fiber_per_100g DECIMAL(8,2) UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY foods_slug_unique (slug),
  KEY foods_name_index (name),
  KEY foods_taco_code_index (taco_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS food_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  food_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY food_aliases_food_id_alias_unique (food_id, alias),
  KEY food_aliases_alias_index (alias),
  CONSTRAINT food_aliases_food_id_foreign
    FOREIGN KEY (food_id)
    REFERENCES foods (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS substitution_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY substitution_groups_slug_unique (slug),
  KEY substitution_groups_name_index (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS food_substitution_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  food_id BIGINT UNSIGNED NOT NULL,
  substitution_group_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY food_substitution_groups_food_group_unique (food_id, substitution_group_id),
  KEY food_substitution_groups_group_index (substitution_group_id),
  CONSTRAINT food_substitution_groups_food_id_foreign
    FOREIGN KEY (food_id)
    REFERENCES foods (id)
    ON DELETE CASCADE,
  CONSTRAINT food_substitution_groups_group_id_foreign
    FOREIGN KEY (substitution_group_id)
    REFERENCES substitution_groups (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
