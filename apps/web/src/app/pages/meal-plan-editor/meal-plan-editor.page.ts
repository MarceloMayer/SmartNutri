import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type {
  CalculateSubstitutionsResponse,
  Food,
  FoodSearchResult,
  NutrientTotals,
  SubstituteResult
} from '../../core/models/nutrition.models';
import type {
  MealPlanDetail,
  MealPlanItem,
  MealPlanMealWithItems,
  MealPlanStatus,
  Patient
} from '../../core/models/patient.models';
import { FoodSearchComponent } from '../../features/foods/components/food-search/food-search.component';
import { FoodService } from '../../features/foods/services/food.service';
import {
  NutritionSummaryCardComponent,
  type NutritionSummaryValues
} from '../../features/meal-plans/components/nutrition-summary-card/nutrition-summary-card.component';
import { PatientService } from '../../features/patients/services/patient.service';

type ViewState = 'idle' | 'loading' | 'error';
type FeedbackTone = 'info' | 'success' | 'error';

@Component({
  selector: 'app-meal-plan-editor-page',
  standalone: true,
  imports: [
    DecimalPipe,
    FoodSearchComponent,
    NgFor,
    NgIf,
    NutritionSummaryCardComponent,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './meal-plan-editor.page.html',
  styleUrl: './meal-plan-editor.page.scss'
})
export class MealPlanEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);
  private readonly foodService = inject(FoodService);

  readonly titleControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });
  readonly patientIdControl = new FormControl<number | null>(null);
  readonly objectiveControl = new FormControl('', {
    nonNullable: true
  });
  readonly descriptionControl = new FormControl('', {
    nonNullable: true
  });
  readonly statusControl = new FormControl<MealPlanStatus>('draft', {
    nonNullable: true
  });

  readonly mealNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });
  readonly mealTimeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]
  });
  readonly mealOrderControl = new FormControl(0, {
    nonNullable: true,
    validators: [Validators.min(0)]
  });

  readonly itemQuantityControl = new FormControl(100, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0.01)]
  });
  readonly itemNotesControl = new FormControl('', {
    nonNullable: true
  });
  readonly itemOrderControl = new FormControl(0, {
    nonNullable: true,
    validators: [Validators.min(0)]
  });

  readonly statusLabels: Record<MealPlanStatus, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado'
  };

  patients: Patient[] = [];
  selectedPlan: MealPlanDetail | null = null;
  selectedFood: Food | null = null;
  activeItemMealId: number | null = null;
  editingMeal: MealPlanMealWithItems | null = null;
  pageState: ViewState = 'idle';
  actionState: ViewState = 'idle';
  substitutionState: ViewState = 'idle';
  messageTone: FeedbackTone = 'info';
  loadingMessage = '';
  message = '';
  duplicatingPlan = false;
  duplicatingMealId: number | null = null;
  orderingMealId: number | null = null;
  orderingItemId: number | null = null;
  savingItemId: number | null = null;
  deletingMealId: number | null = null;
  deletingItemId: number | null = null;
  invalidQuantityItemIds = new Set<number>();
  substitutionItem: MealPlanItem | null = null;
  substitutionResult: CalculateSubstitutionsResponse | null = null;
  substitutionMessage = '';
  readonly collapsedMeals = new Set<number>();

  toggleMealCollapse(mealId: number): void {
    if (this.collapsedMeals.has(mealId)) {
      this.collapsedMeals.delete(mealId);
    } else {
      this.collapsedMeals.add(mealId);
    }
  }

  isMealCollapsed(mealId: number): boolean {
    return this.collapsedMeals.has(mealId);
  }

  get isNewPlan(): boolean {
    return !this.mealPlanId;
  }

  get mealPlanId(): number | null {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  }

  ngOnInit(): void {
    this.loadPatients();

    if (this.mealPlanId) {
      this.loadMealPlan(this.mealPlanId);
    } else {
      const patientIdParam = this.route.snapshot.queryParamMap.get('patientId');
      if (patientIdParam) {
        this.patientIdControl.setValue(Number(patientIdParam));
      }
    }
  }

  loadPatients(): void {
    this.patientService.listPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
      },
      error: (error: unknown) => {
        this.setErrorMessage(error, 'Nao foi possivel carregar pacientes.');
      }
    });
  }

  loadMealPlan(mealPlanId: number, preserveMessage = false): void {
    this.pageState = 'loading';
    if (!preserveMessage) {
      this.clearMessage();
    }

    this.patientService.findMealPlanById(mealPlanId).subscribe({
      next: (mealPlan) => {
        this.selectedPlan = mealPlan;
        this.populatePlanForm(mealPlan);
        this.pageState = 'idle';
      },
      error: (error: unknown) => {
        this.pageState = 'error';
        this.setErrorMessage(error, 'Nao foi possivel carregar o plano alimentar.');
      }
    });
  }

  savePlan(): void {
    this.titleControl.markAsTouched();

    if (this.titleControl.invalid) {
      return;
    }

    this.startAction('Salvando plano alimentar...');

    const payload = {
      patientId: this.patientIdControl.value,
      title: this.titleControl.value.trim(),
      objective: this.objectiveControl.value.trim() || null,
      description: this.descriptionControl.value.trim() || null,
      status: this.statusControl.value
    };
    const request = this.selectedPlan
      ? this.patientService.updateMealPlan(this.selectedPlan.id, payload)
      : this.patientService.createStandaloneMealPlan(payload);

    request.subscribe({
      next: (plan) => {
        this.actionState = 'idle';
        this.setSuccessMessage('Plano salvo.');

        if (!this.selectedPlan) {
          void this.router.navigate(['/meal-plans', plan.id, 'edit']);
          return;
        }

        this.loadMealPlan(plan.id, true);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.setErrorMessage(error, 'Nao foi possivel salvar o plano alimentar.');
      }
    });
  }

  async duplicateCurrentPlan(): Promise<void> {
    if (!this.selectedPlan) {
      return;
    }

    this.startAction('Duplicando plano alimentar...');
    this.duplicatingPlan = true;

    try {
      const duplicatedPlan = await this.patientService.duplicateMealPlan(this.selectedPlan.id);

      this.actionState = 'idle';
      this.duplicatingPlan = false;
      this.setSuccessMessage('Plano duplicado como rascunho.');
      await this.router.navigate(['/meal-plans', duplicatedPlan.id, 'edit']);
      this.loadMealPlan(duplicatedPlan.id, true);
    } catch (error: unknown) {
      this.actionState = 'error';
      this.duplicatingPlan = false;
      this.setErrorMessage(error, 'Nao foi possivel duplicar o plano alimentar.');
    }
  }

  saveMeal(): void {
    if (!this.selectedPlan) {
      return;
    }

    this.mealNameControl.markAsTouched();

    this.mealTimeControl.markAsTouched();

    if (this.mealNameControl.invalid || this.mealTimeControl.invalid || this.mealOrderControl.invalid) {
      return;
    }

    this.startAction(this.editingMeal ? 'Salvando refeição...' : 'Adicionando refeição...');

    const payload = {
      name: this.mealNameControl.value.trim(),
      timeLabel: this.mealTimeControl.value.trim() || null,
      orderIndex: Number(this.mealOrderControl.value)
    };
    const request = this.editingMeal
      ? this.patientService.updateMeal(this.editingMeal.id, payload)
      : this.patientService.createMeal(this.selectedPlan.id, payload);

    request.subscribe({
      next: () => {
        this.actionState = 'idle';
        this.setSuccessMessage(this.editingMeal ? 'Refeição atualizada.' : 'Refeição criada.');
        this.resetMealForm();
        this.reloadPlan(true);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.setErrorMessage(error, 'Nao foi possivel salvar a refeição.');
      }
    });
  }

  startEditMeal(meal: MealPlanMealWithItems): void {
    this.editingMeal = meal;
    this.mealNameControl.setValue(meal.name);
    this.mealTimeControl.setValue(meal.timeLabel ?? '');
    this.mealOrderControl.setValue(meal.orderIndex);
  }

  resetMealForm(): void {
    this.editingMeal = null;
    this.mealNameControl.setValue('');
    this.mealTimeControl.setValue('');
    this.mealOrderControl.setValue(this.selectedPlan?.meals.length ?? 0);
  }

  deleteMeal(meal: MealPlanMealWithItems): void {
    if (!globalThis.confirm(`Remover a refeição "${meal.name}" e todos os alimentos dela?`)) {
      return;
    }

    this.startAction('Removendo refeição...');
    this.deletingMealId = meal.id;

    this.patientService.deleteMeal(meal.id).subscribe({
      next: () => {
        this.actionState = 'idle';
        this.deletingMealId = null;
        this.setSuccessMessage('Refeição removida.');
        if (this.activeItemMealId === meal.id) {
          this.activeItemMealId = null;
        }
        this.reloadPlan(true);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.deletingMealId = null;
        this.setErrorMessage(error, 'Nao foi possivel remover a refeição.');
      }
    });
  }

  async duplicateMeal(meal: MealPlanMealWithItems): Promise<void> {
    if (!this.selectedPlan) {
      return;
    }

    this.startAction('Duplicando refeição...');
    this.duplicatingMealId = meal.id;

    try {
      this.selectedPlan = await this.patientService.duplicateMeal(this.selectedPlan.id, meal);
      this.populatePlanForm(this.selectedPlan);
      this.actionState = 'idle';
      this.duplicatingMealId = null;
      this.setSuccessMessage('Refeição duplicada.');
    } catch (error: unknown) {
      this.actionState = 'error';
      this.duplicatingMealId = null;
      this.setErrorMessage(error, 'Nao foi possivel duplicar a refeição.');
    }
  }

  async moveMeal(meal: MealPlanMealWithItems, direction: -1 | 1): Promise<void> {
    if (!this.selectedPlan) {
      return;
    }

    const meals = sortByOrder(this.selectedPlan.meals);
    const currentIndex = meals.findIndex((item) => item.id === meal.id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= meals.length) {
      return;
    }

    [meals[currentIndex], meals[nextIndex]] = [meals[nextIndex], meals[currentIndex]];
    meals.forEach((item, index) => {
      item.orderIndex = index;
    });
    this.selectedPlan.meals = meals;
    this.orderingMealId = meal.id;
    this.startAction('Salvando ordem das refeições...');

    try {
      await Promise.all(meals.map((item) => {
        return firstValueFrom(this.patientService.updateMeal(item.id, {
          orderIndex: item.orderIndex
        }));
      }));
      this.actionState = 'idle';
      this.orderingMealId = null;
      this.setSuccessMessage('Ordem das refeições salva.');
    } catch (error: unknown) {
      this.actionState = 'error';
      this.orderingMealId = null;
      this.setErrorMessage(error, 'Nao foi possivel salvar a ordem das refeições.');
      this.reloadPlan();
    }
  }

  startAddItem(meal: MealPlanMealWithItems): void {
    this.activeItemMealId = meal.id;
    this.selectedFood = null;
    this.itemQuantityControl.setValue(100);
    this.itemNotesControl.setValue('');
    this.itemOrderControl.setValue(meal.items.length);
  }

  selectFood(candidate: FoodSearchResult): void {
    this.selectedFood = null;

    this.foodService.findById(candidate.id).subscribe({
      next: (food) => {
        this.selectedFood = food;
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.setErrorMessage(error, 'Não foi possível carregar o alimento selecionado.');
      }
    });
  }

  saveItem(meal: MealPlanMealWithItems): void {
    this.itemQuantityControl.markAsTouched();

    if (this.itemQuantityControl.invalid || this.itemOrderControl.invalid) {
      return;
    }

    if (!this.selectedFood) {
      this.actionState = 'error';
      this.message = 'Selecione um alimento.';
      return;
    }

    this.startAction('Salvando alimento...');

    this.patientService.createMealItem(meal.id, {
      foodId: this.selectedFood.id,
      quantity: Number(this.itemQuantityControl.value),
      unit: 'g',
      notes: this.itemNotesControl.value.trim() || null,
      orderIndex: Number(this.itemOrderControl.value)
    }).subscribe({
      next: () => {
        this.actionState = 'idle';
        this.setSuccessMessage('Alimento adicionado.');
        this.activeItemMealId = null;
        this.selectedFood = null;
        this.reloadPlan(true);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.setErrorMessage(error, 'Nao foi possivel adicionar o alimento.');
      }
    });
  }

  previewItemQuantity(item: MealPlanItem, event: Event): void {
    const quantity = this.readPositiveNumber(event);

    if (quantity === null) {
      this.invalidQuantityItemIds.add(item.id);
      return;
    }

    this.invalidQuantityItemIds.delete(item.id);

    if (quantity === item.quantity) {
      return;
    }

    this.scaleItemNutrition(item, quantity);
    this.recalculateLocalTotals();
  }

  saveItemQuantity(item: MealPlanItem): void {
    if (this.invalidQuantityItemIds.has(item.id) || item.quantity <= 0) {
      return;
    }

    this.startAction('Salvando quantidade...');
    this.savingItemId = item.id;

    this.patientService.updateMealItem(item.id, {
      quantity: item.quantity
    }).subscribe({
      next: (updatedItem) => {
        Object.assign(item, updatedItem);
        this.recalculateLocalTotals();
        this.actionState = 'idle';
        this.savingItemId = null;
        this.setSuccessMessage('Valores nutricionais atualizados e salvos.');
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.savingItemId = null;
        this.setErrorMessage(error, 'Nao foi possivel atualizar a quantidade.');
        this.reloadPlan();
      }
    });
  }

  deleteItem(item: MealPlanItem): void {
    if (!globalThis.confirm(`Remover "${item.foodName}" desta refeição?`)) {
      return;
    }

    this.startAction('Removendo alimento...');
    this.deletingItemId = item.id;

    this.patientService.deleteMealItem(item.id).subscribe({
      next: () => {
        this.actionState = 'idle';
        this.deletingItemId = null;
        this.setSuccessMessage('Alimento removido.');
        this.reloadPlan(true);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.deletingItemId = null;
        this.setErrorMessage(error, 'Nao foi possivel remover o alimento.');
      }
    });
  }

  async moveItem(meal: MealPlanMealWithItems, item: MealPlanItem, direction: -1 | 1): Promise<void> {
    const items = sortByOrder(meal.items);
    const currentIndex = items.findIndex((mealItem) => mealItem.id === item.id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    [items[currentIndex], items[nextIndex]] = [items[nextIndex], items[currentIndex]];
    items.forEach((mealItem, index) => {
      mealItem.orderIndex = index;
    });
    meal.items = items;
    this.orderingItemId = item.id;
    this.startAction('Salvando ordem dos alimentos...');

    try {
      await Promise.all(items.map((mealItem) => {
        return firstValueFrom(this.patientService.updateMealItem(mealItem.id, {
          orderIndex: mealItem.orderIndex
        }));
      }));
      this.actionState = 'idle';
      this.orderingItemId = null;
      this.setSuccessMessage('Ordem dos alimentos salva.');
    } catch (error: unknown) {
      this.actionState = 'error';
      this.orderingItemId = null;
      this.setErrorMessage(error, 'Nao foi possivel salvar a ordem dos alimentos.');
      this.reloadPlan();
    }
  }

  viewSubstitutions(item: MealPlanItem): void {
    this.substitutionItem = item;
    this.substitutionResult = null;
    this.substitutionMessage = '';
    this.substitutionState = 'loading';

    this.patientService.calculateItemSubstitutions(item.id).subscribe({
      next: (result) => {
        this.substitutionResult = result;
        this.substitutionState = 'idle';
      },
      error: (error: unknown) => {
        this.substitutionState = 'error';
        this.substitutionMessage = this.resolveErrorMessage(
          error,
          'Nao foi possivel calcular substituições para este alimento.'
        );
      }
    });
  }

  closeSubstitutions(): void {
    this.substitutionItem = null;
    this.substitutionResult = null;
    this.substitutionMessage = '';
    this.substitutionState = 'idle';
  }

  planTotals(): NutritionSummaryValues {
    return {
      kcal: this.selectedPlan?.totalKcal ?? 0,
      carbs: this.selectedPlan?.totalCarbs ?? 0,
      protein: this.selectedPlan?.totalProtein ?? 0,
      fat: this.selectedPlan?.totalFat ?? 0,
      fiber: this.selectedPlan?.totalFiber ?? 0
    };
  }

  mealTotals(meal: MealPlanMealWithItems): NutritionSummaryValues {
    return {
      kcal: meal.totalKcal,
      carbs: meal.totalCarbs,
      protein: meal.totalProtein,
      fat: meal.totalFat,
      fiber: meal.totalFiber
    };
  }

  itemPreview(): NutritionSummaryValues {
    const quantity = Number(this.itemQuantityControl.value);

    if (!this.selectedFood || quantity <= 0) {
      return zeroTotals();
    }

    return {
      kcal: calculateNutrient(this.selectedFood.kcalPer100g, quantity),
      carbs: calculateNutrient(this.selectedFood.carbsPer100g, quantity),
      protein: calculateNutrient(this.selectedFood.proteinPer100g, quantity),
      fat: calculateNutrient(this.selectedFood.fatPer100g, quantity),
      fiber: calculateNutrient(this.selectedFood.fiberPer100g, quantity)
    };
  }

  statusLabel(status: MealPlanStatus): string {
    return this.statusLabels[status];
  }

  nutrientFromTotals(totals: NutrientTotals, nutrient: keyof NutrientTotals): number {
    return totals[nutrient] ?? 0;
  }

  formatDifference(substitute: SubstituteResult, nutrient: 'kcal' | 'carbs'): string {
    const difference = substitute.differences[nutrient];

    if (difference.absolute === null || difference.percent === null) {
      return '-';
    }

    const unit = nutrient === 'kcal' ? 'kcal' : 'g';
    const absoluteSign = difference.absolute > 0 ? '+' : '';
    const percentSign = difference.percent > 0 ? '+' : '';

    return `${absoluteSign}${roundToOne(difference.absolute)} ${unit} (${percentSign}${roundToOne(difference.percent)}%)`;
  }

  private populatePlanForm(mealPlan: MealPlanDetail): void {
    this.titleControl.setValue(mealPlan.title);
    this.patientIdControl.setValue(mealPlan.patientId);
    this.objectiveControl.setValue(mealPlan.objective ?? '');
    this.descriptionControl.setValue(mealPlan.description ?? '');
    this.statusControl.setValue(mealPlan.status);
    this.mealOrderControl.setValue(mealPlan.meals.length);
  }

  private reloadPlan(preserveMessage = false): void {
    if (!this.selectedPlan) {
      return;
    }

    this.loadMealPlan(this.selectedPlan.id, preserveMessage);
  }

  private startAction(message: string): void {
    this.actionState = 'loading';
    this.loadingMessage = message;
    this.clearMessage();
  }

  private clearMessage(): void {
    this.message = '';
    this.messageTone = 'info';
  }

  private setSuccessMessage(message: string): void {
    this.message = message;
    this.messageTone = 'success';
  }

  private setErrorMessage(error: unknown, fallback: string): void {
    this.message = this.resolveErrorMessage(error, fallback);
    this.messageTone = 'error';
  }

  private recalculateLocalTotals(): void {
    if (!this.selectedPlan) {
      return;
    }

    this.selectedPlan.meals.forEach((meal) => {
      meal.totalKcal = roundToTwo(meal.items.reduce((total, item) => total + item.kcal, 0));
      meal.totalCarbs = roundToTwo(meal.items.reduce((total, item) => total + item.carbs, 0));
      meal.totalProtein = roundToTwo(meal.items.reduce((total, item) => total + item.protein, 0));
      meal.totalFat = roundToTwo(meal.items.reduce((total, item) => total + item.fat, 0));
      meal.totalFiber = roundToTwo(meal.items.reduce((total, item) => total + item.fiber, 0));
    });

    this.selectedPlan.totalKcal = roundToTwo(this.selectedPlan.meals.reduce((total, meal) => total + meal.totalKcal, 0));
    this.selectedPlan.totalCarbs = roundToTwo(this.selectedPlan.meals.reduce((total, meal) => total + meal.totalCarbs, 0));
    this.selectedPlan.totalProtein = roundToTwo(this.selectedPlan.meals.reduce((total, meal) => total + meal.totalProtein, 0));
    this.selectedPlan.totalFat = roundToTwo(this.selectedPlan.meals.reduce((total, meal) => total + meal.totalFat, 0));
    this.selectedPlan.totalFiber = roundToTwo(this.selectedPlan.meals.reduce((total, meal) => total + meal.totalFiber, 0));
  }

  private scaleItemNutrition(item: MealPlanItem, quantity: number): void {
    const factor = quantity / item.quantity;

    item.quantity = quantity;
    item.kcal = roundToTwo(item.kcal * factor);
    item.carbs = roundToTwo(item.carbs * factor);
    item.protein = roundToTwo(item.protein * factor);
    item.fat = roundToTwo(item.fat * factor);
    item.fiber = roundToTwo(item.fiber * factor);
  }

  private readPositiveNumber(event: Event): number | null {
    const input = event.target as HTMLInputElement | null;
    const value = Number(input?.value);

    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }
}

function calculateNutrient(valuePer100g: number | null, quantity: number): number {
  return roundToTwo(((valuePer100g ?? 0) * quantity) / 100);
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundToOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function zeroTotals(): NutritionSummaryValues {
  return {
    kcal: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0
  };
}

function sortByOrder<TItem extends { orderIndex: number; id: number }>(items: TItem[]): TItem[] {
  return [...items].sort((first, second) => first.orderIndex - second.orderIndex || first.id - second.id);
}
