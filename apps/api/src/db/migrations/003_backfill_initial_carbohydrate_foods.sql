UPDATE foods
SET
  taco_code = '3',
  source = 'seed',
  kcal_per_100g = 128.26,
  carbs_per_100g = 28.06,
  protein_per_100g = 2.52,
  fat_per_100g = 0.23,
  fiber_per_100g = 1.56,
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'arroz-branco-cozido';

UPDATE foods
SET
  source = 'seed',
  kcal_per_100g = 125.36,
  carbs_per_100g = 30.09,
  protein_per_100g = 0.57,
  fat_per_100g = 0.30,
  fiber_per_100g = 1.56,
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'aipim-cozido';

UPDATE foods
SET
  source = 'seed',
  kcal_per_100g = 96.70,
  carbs_per_100g = 23.23,
  protein_per_100g = 2.05,
  fat_per_100g = 0.21,
  fiber_per_100g = 1.65,
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'inhame-cozido';

UPDATE foods
SET
  source = 'seed',
  kcal_per_100g = 158.00,
  carbs_per_100g = 30.90,
  protein_per_100g = 5.80,
  fat_per_100g = 0.90,
  fiber_per_100g = 1.80,
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'macarrao-cozido';

INSERT INTO food_aliases (food_id, alias)
SELECT foods.id, aliases.alias
FROM foods
INNER JOIN (
  SELECT 'arroz-branco-cozido' AS slug, 'arroz branco' AS alias
  UNION ALL SELECT 'arroz-branco-cozido', 'arroz tipo 1 cozido'
  UNION ALL SELECT 'arroz-integral-cozido', 'arroz integral'
  UNION ALL SELECT 'batata-inglesa-cozida', 'batata inglesa'
  UNION ALL SELECT 'batata-inglesa-cozida', 'batata comum'
  UNION ALL SELECT 'batata-doce-cozida', 'batata doce'
  UNION ALL SELECT 'aipim-cozido', 'aipim'
  UNION ALL SELECT 'aipim-cozido', 'mandioca cozida'
  UNION ALL SELECT 'aipim-cozido', 'macaxeira cozida'
  UNION ALL SELECT 'inhame-cozido', 'inhame'
  UNION ALL SELECT 'macarrao-cozido', 'macarrao'
  UNION ALL SELECT 'macarrao-cozido', 'macarrão'
  UNION ALL SELECT 'macarrao-cozido', 'massa cozida'
) AS aliases ON aliases.slug = foods.slug
ON DUPLICATE KEY UPDATE
  alias = VALUES(alias);
