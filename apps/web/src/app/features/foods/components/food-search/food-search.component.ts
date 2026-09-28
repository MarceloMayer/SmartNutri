import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, concat, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';

import type { FoodSearchResult } from '../../../../core/models/nutrition.models';
import { FoodService } from '../../services/food.service';

interface FoodSearchState {
  foods: FoodSearchResult[];
  isLoading: boolean;
  error: string | null;
  term: string;
}

@Component({
  selector: 'app-food-search',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './food-search.component.html',
  styleUrl: './food-search.component.scss'
})
export class FoodSearchComponent {
  @Output() foodSelected = new EventEmitter<FoodSearchResult>();

  private readonly foodService = inject(FoodService);
  selectedFood: FoodSearchResult | null = null;

  readonly searchControl = new FormControl('', {
    nonNullable: true
  });

  readonly searchState$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    tap(() => {
      this.selectedFood = null;
    }),
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((term) => {
      const normalizedTerm = term.trim();

      if (normalizedTerm.length < 2) {
        return of({
          foods: [],
          isLoading: false,
          error: null,
          term: normalizedTerm
        });
      }

      return concat(
        of({
          foods: [],
          isLoading: true,
          error: null,
          term: normalizedTerm
        }),
        this.foodService.search(normalizedTerm).pipe(
          map((foods) => ({
            foods,
            isLoading: false,
            error: null,
            term: normalizedTerm
          })),
          catchError(() => of({
            foods: [],
            isLoading: false,
            error: 'Nao foi possivel buscar alimentos.',
            term: normalizedTerm
          }))
        )
      );
    })
  );

  selectFood(food: FoodSearchResult): void {
    this.selectedFood = food;
    this.searchControl.setValue(food.name, {
      emitEvent: false
    });
    this.foodSelected.emit(food);
  }
}
