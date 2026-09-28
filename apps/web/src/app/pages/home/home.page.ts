import { HttpErrorResponse } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';

import type {
  CalculateSubstitutionsResponse,
  FoodSearchResult,
  NutrientTotals,
  NutritionComparisonRow,
  SubstituteResult
} from '../../core/models/nutrition.models';
import { FoodSearchComponent } from '../../features/foods/components/food-search/food-search.component';
import { NutritionistPreferenceService } from '../../features/preferences/services/nutritionist-preference.service';
import { NutritionComparisonTableComponent } from '../../features/substitutions/components/nutrition-comparison-table/nutrition-comparison-table.component';
import { SubstitutionCardComponent } from '../../features/substitutions/components/substitution-card/substitution-card.component';
import { SubstitutionService } from '../../features/substitutions/services/substitution.service';
import { AuthService } from '../../core/auth/auth.service';

type ViewState = 'idle' | 'loading' | 'error' | 'empty' | 'success';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FoodSearchComponent,
    NgFor,
    NgIf,
    NutritionComparisonTableComponent,
    ReactiveFormsModule,
    SubstitutionCardComponent
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage {
  private readonly substitutionService = inject(SubstitutionService);
  private readonly preferenceService = inject(NutritionistPreferenceService);
  private readonly authService = inject(AuthService);

  readonly quantityControl = new FormControl(100, {
    nonNullable: true
  });

  selectedFood: FoodSearchResult | null = null;
  calculation: CalculateSubstitutionsResponse | null = null;
  selectedSubstitute: SubstituteResult | null = null;
  state: ViewState = 'idle';
  errorMessage = '';
  preferenceMessage = '';

  get hasSelectedFood(): boolean {
    return this.selectedFood !== null;
  }

  get referenceNutrients(): NutrientTotals | null {
    return this.calculation?.reference.nutrients ?? null;
  }

  get referenceName(): string {
    return this.calculation?.reference.food.name ?? this.selectedFood?.name ?? '';
  }

  get referenceQuantity(): number {
    return this.calculation?.reference.quantity ?? this.quantityControl.value;
  }

  get canManagePreferences(): boolean {
    return this.authService.hasAnyRole(['nutritionist']);
  }

  get comparisonRows(): NutritionComparisonRow[] {
    if (!this.calculation || !this.selectedSubstitute) {
      return [];
    }

    const reference = this.calculation.reference.nutrients;
    const substitute = this.selectedSubstitute;

    return [
      this.buildComparisonRow('kcal', reference.kcal, substitute.nutrients.kcal, substitute.differences.kcal, 'kcal'),
      this.buildComparisonRow('Carboidratos', reference.carbs, substitute.nutrients.carbs, substitute.differences.carbs, 'g'),
      this.buildComparisonRow('Proteinas', reference.protein, substitute.nutrients.protein, substitute.differences.protein, 'g'),
      this.buildComparisonRow('Gorduras', reference.fat, substitute.nutrients.fat, substitute.differences.fat, 'g'),
      this.buildComparisonRow('Fibras', reference.fiber, substitute.nutrients.fiber, substitute.differences.fiber, 'g')
    ];
  }

  handleFoodSelected(food: FoodSearchResult): void {
    this.selectedFood = food;
    this.calculation = null;
    this.selectedSubstitute = null;
    this.state = 'idle';
    this.errorMessage = '';
  }

  calculateSubstitutions(): void {
    if (!this.selectedFood) {
      this.state = 'error';
      this.errorMessage = 'Selecione um alimento para calcular substituicoes.';
      return;
    }

    const quantity = Number(this.quantityControl.value);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.state = 'error';
      this.errorMessage = 'Informe uma quantidade em gramas maior que zero.';
      return;
    }

    this.state = 'loading';
    this.errorMessage = '';

    this.substitutionService.calculate({
      foodId: this.selectedFood.id,
      quantity,
      limit: 10
    }).pipe(
      catchError((error: unknown) => {
        this.state = 'error';
        this.errorMessage = this.getCalculationErrorMessage(error);
        return of(null);
      }),
      finalize(() => {
        if (this.state === 'loading') {
          this.state = 'idle';
        }
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.calculation = response;
      this.selectedSubstitute = response.substitutes[0] ?? null;
      this.state = response.substitutes.length > 0 ? 'success' : 'empty';
    });
  }

  selectSubstitute(substitute: SubstituteResult): void {
    this.selectedSubstitute = substitute;
  }

  favoriteSubstitute(substitute: SubstituteResult): void {
    if (!this.canManagePreferences) {
      return;
    }

    this.preferenceMessage = '';

    this.preferenceService.setFoodPreference(substitute.food.id, 'favorite').subscribe({
      next: () => {
        substitute.isFavorite = true;
        this.preferenceMessage = 'Substituto marcado como favorito.';
      },
      error: (error: unknown) => {
        this.preferenceMessage = this.getCalculationErrorMessage(error);
      }
    });
  }

  blockSubstitute(substitute: SubstituteResult): void {
    if (!this.canManagePreferences) {
      return;
    }

    const referenceFoodId = this.calculation?.reference.food.id;

    if (!referenceFoodId) {
      return;
    }

    this.preferenceMessage = '';

    this.preferenceService.blockSubstitution(referenceFoodId, substitute.food.id).subscribe({
      next: () => {
        if (this.calculation) {
          this.calculation = {
            ...this.calculation,
            substitutes: this.calculation.substitutes.filter((item) => item.food.id !== substitute.food.id)
          };
          this.selectedSubstitute = this.calculation.substitutes[0] ?? null;
          this.state = this.calculation.substitutes.length > 0 ? 'success' : 'empty';
        }
        this.preferenceMessage = 'Substituição bloqueada.';
      },
      error: (error: unknown) => {
        this.preferenceMessage = this.getCalculationErrorMessage(error);
      }
    });
  }

  formatValue(value: number | null | undefined, unit: string): string {
    return value === null || value === undefined ? '-' : `${value} ${unit}`;
  }

  private buildComparisonRow(
    label: string,
    baseValue: number | null,
    substituteValue: number | null,
    difference: { absolute: number | null; percent: number | null },
    unit: string
  ): NutritionComparisonRow {
    return {
      label,
      baseValue,
      substituteValue,
      absoluteDifference: difference.absolute,
      percentDifference: difference.percent,
      unit
    };
  }

  private getCalculationErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Nao foi possivel calcular substituicoes para este alimento.';
  }
}
