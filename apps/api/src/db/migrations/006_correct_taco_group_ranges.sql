UPDATE food_substitution_groups
INNER JOIN foods
  ON foods.id = food_substitution_groups.food_id
INNER JOIN substitution_groups AS current_group
  ON current_group.id = food_substitution_groups.substitution_group_id
INNER JOIN substitution_groups AS target_group
  ON target_group.slug = CASE
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
    ELSE current_group.slug
  END
SET food_substitution_groups.substitution_group_id = target_group.id
WHERE foods.taco_code REGEXP '^[0-9]+$'
  AND current_group.slug IN (
    'cereais-e-derivados',
    'verduras-hortalicas-e-derivados',
    'frutas-e-derivados',
    'gorduras-e-oleos',
    'pescados-e-frutos-do-mar',
    'carnes-e-derivados',
    'leite-e-derivados',
    'bebidas',
    'ovos-e-derivados',
    'acucares-e-doces',
    'miscelaneas',
    'molhos-e-industrializados',
    'preparacoes-prontas',
    'leguminosas-e-derivados',
    'nozes-e-sementes'
  );
