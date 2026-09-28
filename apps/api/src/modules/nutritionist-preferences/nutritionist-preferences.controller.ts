import { NutritionistPreferencesRepository } from './nutritionist-preferences.repository';
import type { BlockSubstitutionBody, UpsertFoodPreferenceBody } from './nutritionist-preferences.types';

export class NutritionistPreferencesController {
  constructor(private readonly preferencesRepository: NutritionistPreferencesRepository) {}

  listFoodPreferences(nutritionistUserId: number) {
    return this.preferencesRepository.listFoodPreferences(nutritionistUserId);
  }

  async upsertFoodPreference(
    nutritionistUserId: number,
    foodId: string,
    body: UpsertFoodPreferenceBody
  ) {
    const parsedFoodId = Number(foodId);

    if (!await this.preferencesRepository.foodExists(parsedFoodId)) {
      return {
        status: 'not_found' as const,
        message: 'Food not found'
      };
    }

    return {
      status: 'ok' as const,
      data: await this.preferencesRepository.upsertFoodPreference(
        nutritionistUserId,
        parsedFoodId,
        body.preferenceType
      )
    };
  }

  deleteFoodPreference(nutritionistUserId: number, foodId: string) {
    return this.preferencesRepository.deleteFoodPreference(nutritionistUserId, Number(foodId));
  }

  async blockSubstitution(nutritionistUserId: number, body: BlockSubstitutionBody) {
    if (body.referenceFoodId === body.blockedFoodId) {
      return {
        status: 'unprocessable' as const,
        message: 'Reference and blocked foods must be different'
      };
    }

    const [referenceExists, blockedExists] = await Promise.all([
      this.preferencesRepository.foodExists(body.referenceFoodId),
      this.preferencesRepository.foodExists(body.blockedFoodId)
    ]);

    if (!referenceExists || !blockedExists) {
      return {
        status: 'not_found' as const,
        message: 'Food not found'
      };
    }

    return {
      status: 'ok' as const,
      data: await this.preferencesRepository.blockSubstitution(
        nutritionistUserId,
        body.referenceFoodId,
        body.blockedFoodId
      )
    };
  }

  deleteBlockedSubstitution(
    nutritionistUserId: number,
    referenceFoodId: string,
    blockedFoodId: string
  ) {
    return this.preferencesRepository.deleteBlockedSubstitution(
      nutritionistUserId,
      Number(referenceFoodId),
      Number(blockedFoodId)
    );
  }
}
