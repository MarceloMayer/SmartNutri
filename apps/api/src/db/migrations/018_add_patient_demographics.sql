-- Adiciona campos demográficos ao cadastro do paciente
-- Necessários para cálculos de composição corporal e gasto calórico

ALTER TABLE patients
  ADD COLUMN birth_date DATE NULL AFTER notes,
  ADD COLUMN sex        ENUM('male', 'female') NULL AFTER birth_date;
