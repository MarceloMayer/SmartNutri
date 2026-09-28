CREATE TABLE IF NOT EXISTS meal_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  meal_name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  visibility ENUM('nutritionist_only', 'shared_with_patients') NOT NULL DEFAULT 'nutritionist_only',
  image_original_name VARCHAR(255) NULL,
  image_file_name VARCHAR(255) NULL,
  image_mime_type VARCHAR(100) NULL,
  image_file_size INT UNSIGNED NULL,
  image_file_path VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meal_posts_nutritionist_created_index (nutritionist_user_id, created_at),
  KEY meal_posts_patient_created_index (patient_id, created_at),
  KEY meal_posts_visibility_index (visibility),
  CONSTRAINT meal_posts_nutritionist_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT meal_posts_patient_id_foreign
    FOREIGN KEY (patient_id)
    REFERENCES patients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_post_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_post_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  content VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meal_post_comments_post_created_index (meal_post_id, created_at),
  KEY meal_post_comments_author_user_id_index (author_user_id),
  CONSTRAINT meal_post_comments_meal_post_id_foreign
    FOREIGN KEY (meal_post_id)
    REFERENCES meal_posts (id)
    ON DELETE CASCADE,
  CONSTRAINT meal_post_comments_author_user_id_foreign
    FOREIGN KEY (author_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
