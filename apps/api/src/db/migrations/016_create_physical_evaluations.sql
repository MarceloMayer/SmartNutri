CREATE TABLE IF NOT EXISTS physical_evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nutritionist_user_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  evaluated_at DATE NOT NULL,
  weight_kg DECIMAL(5,1) UNSIGNED NOT NULL,
  height_cm DECIMAL(5,1) UNSIGNED NOT NULL,
  bmi DECIMAL(5,2) UNSIGNED NOT NULL,
  goal VARCHAR(255) NULL,
  -- medidas corporais (cm)
  waist_cm DECIMAL(5,1) UNSIGNED NULL,
  hip_cm DECIMAL(5,1) UNSIGNED NULL,
  abdomen_cm DECIMAL(5,1) UNSIGNED NULL,
  chest_cm DECIMAL(5,1) UNSIGNED NULL,
  right_arm_cm DECIMAL(5,1) UNSIGNED NULL,
  left_arm_cm DECIMAL(5,1) UNSIGNED NULL,
  right_forearm_cm DECIMAL(5,1) UNSIGNED NULL,
  left_forearm_cm DECIMAL(5,1) UNSIGNED NULL,
  right_thigh_cm DECIMAL(5,1) UNSIGNED NULL,
  left_thigh_cm DECIMAL(5,1) UNSIGNED NULL,
  right_calf_cm DECIMAL(5,1) UNSIGNED NULL,
  left_calf_cm DECIMAL(5,1) UNSIGNED NULL,
  -- dobras cutâneas (mm)
  triceps_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  biceps_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  subscapular_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  suprailiac_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  abdominal_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  pectoral_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  midaxillary_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  thigh_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  calf_skinfold_mm DECIMAL(5,1) UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY physical_evaluations_nutritionist_user_id_index (nutritionist_user_id),
  KEY physical_evaluations_patient_id_index (patient_id),
  KEY physical_evaluations_evaluated_at_index (evaluated_at),
  CONSTRAINT physical_evaluations_nutritionist_user_id_foreign
    FOREIGN KEY (nutritionist_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT physical_evaluations_patient_id_foreign
    FOREIGN KEY (patient_id)
    REFERENCES patients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
