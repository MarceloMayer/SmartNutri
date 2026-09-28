ALTER TABLE patients
  ADD COLUMN patient_user_id BIGINT UNSIGNED NULL AFTER nutritionist_user_id;

UPDATE patients
INNER JOIN (
  SELECT
    MIN(patients.id) AS patient_id,
    users.id AS patient_user_id
  FROM patients
  INNER JOIN users
    ON users.email = patients.email
    AND users.role = 'patient'
  WHERE patients.email IS NOT NULL
  GROUP BY users.id
) AS linked_patients
  ON linked_patients.patient_id = patients.id
SET patients.patient_user_id = linked_patients.patient_user_id
WHERE patients.patient_user_id IS NULL;

ALTER TABLE patients
  ADD UNIQUE KEY patients_patient_user_id_unique (patient_user_id),
  ADD CONSTRAINT patients_patient_user_id_foreign
    FOREIGN KEY (patient_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL;
