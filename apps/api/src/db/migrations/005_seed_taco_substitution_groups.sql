INSERT INTO substitution_groups (name, slug, description)
VALUES
  ('Cereais e derivados', 'cereais-e-derivados', 'Cereais, massas, farinhas, paes e derivados da tabela TACO.'),
  ('Verduras, hortalicas e derivados', 'verduras-hortalicas-e-derivados', 'Verduras, legumes, tuberculos e derivados da tabela TACO.'),
  ('Frutas e derivados', 'frutas-e-derivados', 'Frutas, polpas, sucos e derivados da tabela TACO.'),
  ('Gorduras e oleos', 'gorduras-e-oleos', 'Oleos e gorduras da tabela TACO.'),
  ('Pescados e frutos do mar', 'pescados-e-frutos-do-mar', 'Peixes, camaroes e frutos do mar da tabela TACO.'),
  ('Carnes e derivados', 'carnes-e-derivados', 'Carnes bovinas, aves, suinos, embutidos e derivados da tabela TACO.'),
  ('Leite e derivados', 'leite-e-derivados', 'Leites, iogurtes, queijos e derivados da tabela TACO.'),
  ('Bebidas', 'bebidas', 'Bebidas alcoolicas e nao alcoolicas da tabela TACO.'),
  ('Ovos e derivados', 'ovos-e-derivados', 'Ovos e preparacoes com ovos da tabela TACO.'),
  ('Acucares e doces', 'acucares-e-doces', 'Acucares, chocolates, doces e confeitaria da tabela TACO.'),
  ('Miscelaneas', 'miscelaneas', 'Ingredientes, condimentos e itens diversos da tabela TACO.'),
  ('Molhos e industrializados', 'molhos-e-industrializados', 'Molhos, conservas e industrializados da tabela TACO.'),
  ('Preparacoes prontas', 'preparacoes-prontas', 'Preparacoes culinarias prontas da tabela TACO.'),
  ('Leguminosas e derivados', 'leguminosas-e-derivados', 'Feijoes, ervilhas, lentilhas, soja e derivados da tabela TACO.'),
  ('Nozes e sementes', 'nozes-e-sementes', 'Oleaginosas, sementes e derivados da tabela TACO.')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO food_substitution_groups (food_id, substitution_group_id)
SELECT mapped.food_id, substitution_groups.id
FROM (
  SELECT
    foods.id AS food_id,
    CASE
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 1 AND 63 THEN 'cereais-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 64 AND 162 THEN 'verduras-hortalicas-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 163 AND 258 THEN 'frutas-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 259 AND 272 THEN 'gorduras-e-oleos'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 273 AND 322 THEN 'pescados-e-frutos-do-mar'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 323 AND 445 THEN 'carnes-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 446 AND 469 THEN 'leite-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 470 AND 483 THEN 'bebidas'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 484 AND 490 THEN 'ovos-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 491 AND 510 THEN 'acucares-e-doces'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 511 AND 519 THEN 'miscelaneas'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 520 AND 524 THEN 'molhos-e-industrializados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 525 AND 556 THEN 'preparacoes-prontas'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 557 AND 586 THEN 'leguminosas-e-derivados'
      WHEN CAST(foods.taco_code AS UNSIGNED) BETWEEN 587 AND 597 THEN 'nozes-e-sementes'
      ELSE NULL
    END AS group_slug
  FROM foods
  WHERE foods.taco_code REGEXP '^[0-9]+$'
    AND NOT EXISTS (
      SELECT 1
      FROM food_substitution_groups
      WHERE food_substitution_groups.food_id = foods.id
    )
) AS mapped
INNER JOIN substitution_groups ON substitution_groups.slug = mapped.group_slug
WHERE mapped.group_slug IS NOT NULL
ON DUPLICATE KEY UPDATE
  substitution_group_id = VALUES(substitution_group_id);
