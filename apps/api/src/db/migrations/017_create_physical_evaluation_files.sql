CREATE TABLE IF NOT EXISTS physical_evaluation_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  physical_evaluation_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('photo', 'attachment') NOT NULL,
  category ENUM('front', 'side', 'back', 'other', 'document') NOT NULL DEFAULT 'other',
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pef_evaluation_id_index (physical_evaluation_id),
  KEY pef_patient_id_index (patient_id),
  KEY pef_nutritionist_id_index (nutritionist_user_id),
  CONSTRAINT pef_evaluation_fk
    FOREIGN KEY (physical_evaluation_id)
    REFERENCES physical_evaluations (id)
    ON DELETE CASCADE,
  CONSTRAINT pef_patient_fk
    FOREIGN KEY (patient_id)
    REFERENCES patients (id)
    ON DELETE CASCADE,
  CONSTRAINT pef_nutritionist_fk
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
