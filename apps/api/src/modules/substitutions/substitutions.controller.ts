import { SubstitutionsRepository } from './substitutions.repository';
import type { FoodPreferenceType } from '../nutritionist-preferences/nutritionist-preferences.types';
import type {
  CalculateSubstitutionsBody,
  CalculateSubstitutionsResult,
  EquivalenceNutrient,
  FoodForCalculation,
  NutrientDifference,
  NutrientTotals,
  SubstitutionGroupSummary,
  SubstitutionsQuery
} from './substitutions.types';

const defaultLimit = 10;
const maxKcalDifferencePercent = 15;
const maxBasisDifferencePercent = 20;

const carbBasedGroupSlugs = new Set([
  'carboidratos-cozidos',
  'cereais-e-derivados',
  'verduras-hortalicas-e-derivados',
  'frutas-e-derivados',
  'bebidas',
  'acucares-e-doces',
  'leguminosas-e-derivados'
]);

const proteinBasedGroupSlugs = new Set([
  'pescados-e-frutos-do-mar',
  'carnes-e-derivados',
  'leite-e-derivados',
  'ovos-e-derivados'
]);

const fatBasedGroupSlugs = new Set([
  'gorduras-e-oleos',
  'molhos-e-industrializados',
  'nozes-e-sementes'
]);

const equivalenceLabels: Record<EquivalenceNutrient, string> = {
  carbs: 'carboidratos',
  protein: 'proteinas',
  fat: 'gorduras'
};

interface CalculateSubstitutionsOptions {
  nutritionistUserId?: number;
}

export class SubstitutionsController {
  constructor(private readonly substitutionsRepository: SubstitutionsRepository) {}

  list(query: SubstitutionsQuery) {
    return this.substitutionsRepository.list(query);
  }

  async calculate(
    body: CalculateSubstitutionsBody,
    options: CalculateSubstitutionsOptions = {}
  ): Promise<CalculateSubstitutionsResult> {
    const referenceFood = await this.substitutionsRepository.findFoodById(body.foodId);

    if (!referenceFood) {
      return {
        status: 'not_found',
        message: 'Food not found'
      };
    }

    const referenceGroups = await this.substitutionsRepository.findGroupsByFoodId(referenceFood.id);

    if (referenceGroups.length === 0) {
      return {
        status: 'unprocessable',
        message: 'Este alimento ainda nao esta vinculado a um grupo de substituicao.'
      };
    }

    const equivalenceNutrient = chooseEquivalenceNutrient(referenceFood, referenceGroups);

    if (!equivalenceNutrient) {
      return {
        status: 'unprocessable',
        message: 'Este alimento nao possui nutrientes suficientes para calcular equivalencias.'
      };
    }

    if (!hasPositiveValue(referenceFood.kcalPer100g) || !hasPositiveValue(getNutrientPer100g(referenceFood, equivalenceNutrient))) {
      return {
        status: 'unprocessable',
        message: `Este alimento nao possui calorias e ${equivalenceLabels[equivalenceNutrient]} suficientes para a regra atual de equivalencia.`
      };
    }

    const referenceNutrients = calculateNutrients(referenceFood, body.quantity);

    if (!referenceNutrients.kcal || !referenceNutrients[equivalenceNutrient]) {
      return {
        status: 'unprocessable',
        message: 'A quantidade informada nao gera nutrientes suficientes para calcular equivalencias.'
      };
    }

    const candidates = await this.substitutionsRepository.findCandidatesByGroupIds(
      referenceFood.id,
      referenceGroups.map((group) => group.id)
    );
    const candidateIds = candidates.map((candidate) => candidate.id);
    const preferencesByFoodId = options.nutritionistUserId
      ? await this.substitutionsRepository.findPreferencesByFoodIds(options.nutritionistUserId, candidateIds)
      : new Map<number, FoodPreferenceType>();
    const blockedFoodIds = options.nutritionistUserId
      ? await this.substitutionsRepository.findBlockedSubstitutionFoodIds(options.nutritionistUserId, referenceFood.id)
      : new Set<number>();
    const limit = Math.min(body.limit ?? defaultLimit, 50);

    const substitutes = candidates
      .filter((candidate) => preferencesByFoodId.get(candidate.id) !== 'avoid')
      .filter((candidate) => !blockedFoodIds.has(candidate.id))
      .filter((candidate) => hasPositiveValue(candidate.kcalPer100g) && hasPositiveValue(getNutrientPer100g(candidate, equivalenceNutrient)))
      .map((candidate) => buildSubstitute(
        candidate,
        referenceNutrients,
        equivalenceNutrient,
        preferencesByFoodId.get(candidate.id) === 'favorite'
      ))
      .filter((substitute) => {
        return substitute.differences.kcal.percent !== null
          && substitute.differences[equivalenceNutrient].percent !== null
          && substitute.differences.kcal.percent <= maxKcalDifferencePercent
          && (substitute.differences[equivalenceNutrient].percent as number) <= maxBasisDifferencePercent;
      })
      .sort((first, second) => Number(second.isFavorite) - Number(first.isFavorite) || first.score - second.score)
      .slice(0, limit);

    return {
      status: 'ok',
      data: {
        equivalence: {
          nutrient: equivalenceNutrient,
          label: equivalenceLabels[equivalenceNutrient],
          maxDifferencePercent: maxBasisDifferencePercent
        },
        reference: {
          food: toFoodSummary(referenceFood),
          quantity: roundToTwo(body.quantity),
          nutrients: referenceNutrients,
          groups: referenceGroups
        },
        substitutes
      }
    };
  }
}

function buildSubstitute(
  candidate: FoodForCalculation,
  referenceNutrients: NutrientTotals,
  equivalenceNutrient: EquivalenceNutrient,
  isFavorite: boolean
) {
  const quantityByCalories = (referenceNutrients.kcal as number) / (candidate.kcalPer100g as number) * 100;
  const quantityByBasis = (referenceNutrients[equivalenceNutrient] as number) / (getNutrientPer100g(candidate, equivalenceNutrient) as number) * 100;
  const quantity = roundQuantity(quantityByCalories * 0.6 + quantityByBasis * 0.4);
  const nutrients = calculateNutrients(candidate, quantity);
  const differences = calculateDifferences(referenceNutrients, nutrients);
  const score = roundToTwo((differences.kcal.percent as number) * 0.6 + (differences[equivalenceNutrient].percent as number) * 0.4);

  return {
    food: toFoodSummary(candidate),
    isFavorite,
    quantity,
    nutrients,
    differences,
    score
  };
}

function chooseEquivalenceNutrient(
  food: FoodForCalculation,
  groups: SubstitutionGroupSummary[]
): EquivalenceNutrient | null {
  if (groups.some((group) => fatBasedGroupSlugs.has(group.slug)) && hasPositiveValue(food.fatPer100g)) {
    return 'fat';
  }

  if (groups.some((group) => proteinBasedGroupSlugs.has(group.slug)) && hasPositiveValue(food.proteinPer100g)) {
    return 'protein';
  }

  if (groups.some((group) => carbBasedGroupSlugs.has(group.slug)) && hasPositiveValue(food.carbsPer100g)) {
    return 'carbs';
  }

  return chooseDominantNutrient(food);
}

function chooseDominantNutrient(food: FoodForCalculation): EquivalenceNutrient | null {
  const candidates: Array<{ nutrient: EquivalenceNutrient; energy: number }> = [
    {
      nutrient: 'carbs' as EquivalenceNutrient,
      energy: (food.carbsPer100g ?? 0) * 4
    },
    {
      nutrient: 'protein' as EquivalenceNutrient,
      energy: (food.proteinPer100g ?? 0) * 4
    },
    {
      nutrient: 'fat' as EquivalenceNutrient,
      energy: (food.fatPer100g ?? 0) * 9
    }
  ].filter((candidate) => candidate.energy > 0);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((first, second) => second.energy - first.energy)[0].nutrient;
}

function getNutrientPer100g(food: FoodForCalculation, nutrient: EquivalenceNutrient): number | null {
  if (nutrient === 'carbs') {
    return food.carbsPer100g;
  }

  if (nutrient === 'protein') {
    return food.proteinPer100g;
  }

  return food.fatPer100g;
}

function calculateNutrients(food: FoodForCalculation, quantity: number): NutrientTotals {
  return {
    kcal: calculateNutrient(food.kcalPer100g, quantity),
    carbs: calculateNutrient(food.carbsPer100g, quantity),
    protein: calculateNutrient(food.proteinPer100g, quantity),
    fat: calculateNutrient(food.fatPer100g, quantity),
    fiber: calculateNutrient(food.fiberPer100g, quantity)
  };
}

function calculateNutrient(valuePer100g: number | null, quantity: number): number | null {
  return valuePer100g === null ? null : roundToTwo(valuePer100g * quantity / 100);
}

function calculateDifferences(reference: NutrientTotals, substitute: NutrientTotals): Record<keyof NutrientTotals, NutrientDifference> {
  return {
    kcal: calculateDifference(reference.kcal, substitute.kcal),
    carbs: calculateDifference(reference.carbs, substitute.carbs),
    protein: calculateDifference(reference.protein, substitute.protein),
    fat: calculateDifference(reference.fat, substitute.fat),
    fiber: calculateDifference(reference.fiber, substitute.fiber)
  };
}

function calculateDifference(referenceValue: number | null, substituteValue: number | null): NutrientDifference {
  if (referenceValue === null || substituteValue === null) {
    return {
      absolute: null,
      percent: null
    };
  }

  const absolute = Math.abs(substituteValue - referenceValue);

  return {
    absolute: roundToTwo(absolute),
    percent: referenceValue === 0 ? null : roundToTwo(absolute / referenceValue * 100)
  };
}

function roundQuantity(quantity: number): number {
  const step = quantity < 100 ? 5 : 10;
  return Math.max(step, Math.round(quantity / step) * step);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasPositiveValue(value: number | null): boolean {
  return value !== null && value > 0;
}

function toFoodSummary(food: FoodForCalculation) {
  return {
    id: food.id,
    name: food.name,
    slug: food.slug
  };
}
