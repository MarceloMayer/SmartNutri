import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';

export type FoodPreferenceType = 'favorite' | 'avoid';

export interface NutritionistFoodPreference {
  id: number;
  nutritionistUserId: number;
  foodId: number;
  preferenceType: FoodPreferenceType;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionistBlockedSubstitution {
  id: number;
  nutritionistUserId: number;
  referenceFoodId: number;
  blockedFoodId: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NutritionistPreferenceService {
  private readonly api = inject(ApiClientService);

  listFoodPreferences(): Observable<NutritionistFoodPreference[]> {
    return this.api.get<NutritionistFoodPreference[]>('/nutritionist-food-preferences');
  }

  setFoodPreference(foodId: number, preferenceType: FoodPreferenceType): Observable<NutritionistFoodPreference> {
    return this.api.put<NutritionistFoodPreference, { preferenceType: FoodPreferenceType }>(
      `/nutritionist-food-preferences/${foodId}`,
      { preferenceType }
    );
  }

  clearFoodPreference(foodId: number): Observable<void> {
    return this.api.delete<void>(`/nutritionist-food-preferences/${foodId}`);
  }

  blockSubstitution(referenceFoodId: number, blockedFoodId: number): Observable<NutritionistBlockedSubstitution> {
    return this.api.post<NutritionistBlockedSubstitution, { referenceFoodId: number; blockedFoodId: number }>(
      '/nutritionist-blocked-substitutions',
      {
        referenceFoodId,
        blockedFoodId
      }
    );
  }

  unblockSubstitution(referenceFoodId: number, blockedFoodId: number): Observable<void> {
    return this.api.delete<void>(
      `/nutritionist-blocked-substitutions/${referenceFoodId}/${blockedFoodId}`
    );
  }
}
