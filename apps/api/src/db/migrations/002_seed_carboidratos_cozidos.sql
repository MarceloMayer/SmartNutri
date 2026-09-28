INSERT INTO substitution_groups (name, slug, description)
VALUES (
  'Carboidratos cozidos',
  'carboidratos-cozidos',
  'Alimentos fonte de carboidratos em preparacoes cozidas.'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO foods (
  name,
  slug,
  taco_code,
  source,
  kcal_per_100g,
  carbs_per_100g,
  protein_per_100g,
  fat_per_100g,
  fiber_per_100g
)
VALUES
  ('arroz branco cozido', 'arroz-branco-cozido', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('arroz integral cozido', 'arroz-integral-cozido', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('batata inglesa cozida', 'batata-inglesa-cozida', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('batata doce cozida', 'batata-doce-cozida', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('aipim cozido', 'aipim-cozido', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('inhame cozido', 'inhame-cozido', NULL, 'seed', NULL, NULL, NULL, NULL, NULL),
  ('macarrão cozido', 'macarrao-cozido', NULL, 'seed', NULL, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  taco_code = VALUES(taco_code),
  source = VALUES(source),
  kcal_per_100g = VALUES(kcal_per_100g),
  carbs_per_100g = VALUES(carbs_per_100g),
  protein_per_100g = VALUES(protein_per_100g),
  fat_per_100g = VALUES(fat_per_100g),
  fiber_per_100g = VALUES(fiber_per_100g),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO food_substitution_groups (food_id, substitution_group_id)
SELECT foods.id, substitution_groups.id
FROM foods
INNER JOIN substitution_groups
  ON substitution_groups.slug = 'carboidratos-cozidos'
WHERE foods.slug IN (
  'arroz-branco-cozido',
  'arroz-integral-cozido',
  'batata-inglesa-cozida',
  'batata-doce-cozida',
  'aipim-cozido',
  'inhame-cozido',
  'macarrao-cozido'
)
ON DUPLICATE KEY UPDATE
  food_id = food_id;
