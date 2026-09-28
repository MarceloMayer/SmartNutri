import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type { Food, FoodAlias, FoodSearchResult } from '../../../core/models/nutrition.models';

@Injectable({
  providedIn: 'root'
})
export class FoodService {
  private readonly api = inject(ApiClientService);

  list(limit = 20): Observable<Food[]> {
    return this.api.get<Food[]>('/foods', {
      limit
    });
  }

  search(term: string, limit = 10): Observable<FoodSearchResult[]> {
    return this.api.get<FoodSearchResult[]>('/foods/search', {
      q: term,
      limit
    });
  }

  findById(id: number): Observable<Food> {
    return this.api.get<Food>(`/foods/${id}`);
  }

  findAliases(foodId: number): Observable<FoodAlias[]> {
    return this.api.get<FoodAlias[]>('/food-aliases', {
      foodId
    });
  }
}
