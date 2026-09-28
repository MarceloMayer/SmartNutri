INSERT INTO food_substitution_groups (food_id, substitution_group_id)
SELECT foods.id, substitution_groups.id
FROM foods
INNER JOIN substitution_groups
  ON substitution_groups.slug = 'carboidratos-cozidos'
WHERE foods.slug IN (
  'arroz-tipo-1-cozido',
  'arroz-tipo-2-cozido',
  'mandioca-cozida'
)
ON DUPLICATE KEY UPDATE
  food_id = food_id;

INSERT INTO food_aliases (food_id, alias)
SELECT foods.id, aliases.alias
FROM foods
INNER JOIN (
  SELECT 'arroz-tipo-1-cozido' AS slug, 'arroz tipo 1 cozido' AS alias
  UNION ALL SELECT 'arroz-tipo-2-cozido', 'arroz tipo 2 cozido'
  UNION ALL SELECT 'mandioca-cozida', 'aipim cozido'
  UNION ALL SELECT 'mandioca-cozida', 'macaxeira cozida'
) AS aliases ON aliases.slug = foods.slug
ON DUPLICATE KEY UPDATE
  alias = VALUES(alias);
