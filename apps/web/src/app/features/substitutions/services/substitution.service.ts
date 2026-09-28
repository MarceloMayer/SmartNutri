import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type {
  CalculateSubstitutionsResponse,
  SubstitutionGroupFood,
  SubstituteResult,
  SubstitutionGroup
} from '../../../core/models/nutrition.models';

export interface CalculateSubstitutionsPayload {
  foodId: number;
  quantity: number;
  limit?: number;
}

export interface SaveSubstitutionGroupPayload {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface AddFoodToGroupPayload {
  foodId: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubstitutionService {
  private readonly api = inject(ApiClientService);

  listGroups(): Observable<SubstitutionGroup[]> {
    return this.api.get<SubstitutionGroup[]>('/substitution-groups');
  }

  listGroupFoods(groupId: number): Observable<SubstitutionGroupFood[]> {
    return this.api.get<SubstitutionGroupFood[]>(`/substitution-groups/${groupId}/foods`);
  }

  createGroup(payload: SaveSubstitutionGroupPayload): Observable<SubstitutionGroup> {
    return this.api.post<SubstitutionGroup, SaveSubstitutionGroupPayload>('/substitution-groups', payload);
  }

  updateGroup(groupId: number, payload: SaveSubstitutionGroupPayload): Observable<SubstitutionGroup> {
    return this.api.put<SubstitutionGroup, SaveSubstitutionGroupPayload>(
      `/substitution-groups/${groupId}`,
      payload
    );
  }

  updateGroupStatus(groupId: number, isActive: boolean): Observable<SubstitutionGroup> {
    return this.api.patch<SubstitutionGroup, { isActive: boolean }>(
      `/substitution-groups/${groupId}/status`,
      { isActive }
    );
  }

  addFoodToGroup(groupId: number, payload: AddFoodToGroupPayload): Observable<{ groupId: number; foodId: number }> {
    return this.api.post<{ groupId: number; foodId: number }, AddFoodToGroupPayload>(
      `/substitution-groups/${groupId}/foods`,
      payload
    );
  }

  removeFoodFromGroup(groupId: number, foodId: number): Observable<void> {
    return this.api.delete<void>(`/substitution-groups/${groupId}/foods/${foodId}`);
  }

  listByFood(sourceFoodId: number, limit = 10): Observable<SubstituteResult[]> {
    return this.api.get<SubstituteResult[]>('/substitutions', {
      sourceFoodId,
      limit
    });
  }

  calculate(payload: CalculateSubstitutionsPayload): Observable<CalculateSubstitutionsResponse> {
    return this.api.post<CalculateSubstitutionsResponse, CalculateSubstitutionsPayload>(
      '/substitutions/calculate',
      payload
    );
  }
}
