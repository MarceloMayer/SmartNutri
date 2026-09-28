import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type { CalculateSubstitutionsResponse } from '../../../core/models/nutrition.models';
import type {
  MealPlan,
  MealPlanDetail,
  MealPlanItem,
  MealPlanMeal,
  Patient,
  CreatePatientResponse,
  SaveMealPayload,
  SaveMealPlanItemPayload,
  SaveMealPlanPayload,
  SavePatientPayload,
  UpdateMealPayload,
  UpdateMealPlanItemPayload,
  UpdateMealPlanPayload
} from '../../../core/models/patient.models';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly api = inject(ApiClientService);

  listPatients(): Observable<Patient[]> {
    return this.api.get<Patient[]>('/patients');
  }

  createPatient(payload: SavePatientPayload): Observable<CreatePatientResponse> {
    return this.api.post<CreatePatientResponse, SavePatientPayload>('/patients', payload);
  }

  findPatientById(patientId: number): Observable<Patient> {
    return this.api.get<Patient>(`/patients/${patientId}`);
  }

  updatePatient(patientId: number, payload: SavePatientPayload): Observable<Patient> {
    return this.api.put<Patient, SavePatientPayload>(`/patients/${patientId}`, payload);
  }

  deletePatient(patientId: number): Observable<void> {
    return this.api.delete<void>(`/patients/${patientId}`);
  }

  listMealPlans(patientId?: number): Observable<MealPlan[]> {
    if (patientId) {
      return this.api.get<MealPlan[]>(`/patients/${patientId}/meal-plans`);
    }

    return this.api.get<MealPlan[]>('/meal-plans');
  }

  createMealPlan(patientId: number, payload: SaveMealPlanPayload): Observable<MealPlan> {
    return this.api.post<MealPlan, SaveMealPlanPayload>(
      `/patients/${patientId}/meal-plans`,
      payload
    );
  }

  createStandaloneMealPlan(payload: SaveMealPlanPayload): Observable<MealPlan> {
    return this.api.post<MealPlan, SaveMealPlanPayload>('/meal-plans', payload);
  }

  findMealPlanById(mealPlanId: number): Observable<MealPlanDetail> {
    return this.api.get<MealPlanDetail>(`/meal-plans/${mealPlanId}`);
  }

  updateMealPlan(mealPlanId: number, payload: UpdateMealPlanPayload): Observable<MealPlan> {
    return this.api.patch<MealPlan, UpdateMealPlanPayload>(`/meal-plans/${mealPlanId}`, payload);
  }

  deleteMealPlan(mealPlanId: number): Observable<void> {
    return this.api.delete<void>(`/meal-plans/${mealPlanId}`);
  }

  createMeal(mealPlanId: number, payload: SaveMealPayload): Observable<MealPlanMeal> {
    return this.api.post<MealPlanMeal, SaveMealPayload>(
      `/meal-plans/${mealPlanId}/meals`,
      payload
    );
  }

  updateMeal(mealId: number, payload: UpdateMealPayload): Observable<MealPlanMeal> {
    return this.api.patch<MealPlanMeal, UpdateMealPayload>(`/meal-plan-meals/${mealId}`, payload);
  }

  deleteMeal(mealId: number): Observable<void> {
    return this.api.delete<void>(`/meal-plan-meals/${mealId}`);
  }

  createMealItem(mealId: number, payload: SaveMealPlanItemPayload): Observable<MealPlanItem> {
    return this.api.post<MealPlanItem, SaveMealPlanItemPayload>(
      `/meal-plan-meals/${mealId}/items`,
      payload
    );
  }

  updateMealItem(itemId: number, payload: UpdateMealPlanItemPayload): Observable<MealPlanItem> {
    return this.api.patch<MealPlanItem, UpdateMealPlanItemPayload>(
      `/meal-plan-items/${itemId}`,
      payload
    );
  }

  deleteMealItem(itemId: number): Observable<void> {
    return this.api.delete<void>(`/meal-plan-items/${itemId}`);
  }

  calculateItemSubstitutions(itemId: number): Observable<CalculateSubstitutionsResponse> {
    return this.api.post<CalculateSubstitutionsResponse, Record<string, never>>(
      `/meal-plan-items/${itemId}/substitutions`,
      {}
    );
  }

  recalculateMealPlan(mealPlanId: number): Observable<MealPlanDetail> {
    return this.api.post<MealPlanDetail, Record<string, never>>(
      `/meal-plans/${mealPlanId}/recalculate`,
      {}
    );
  }

  async duplicateMealPlan(mealPlanId: number): Promise<MealPlanDetail> {
    const sourcePlan = await firstValueFrom(this.findMealPlanById(mealPlanId));
    const duplicatedPlan = await firstValueFrom(this.createStandaloneMealPlan({
      patientId: sourcePlan.patientId,
      title: `${sourcePlan.title} - copia`,
      objective: sourcePlan.objective,
      description: sourcePlan.description,
      status: 'draft'
    }));

    for (const meal of sortByOrder(sourcePlan.meals)) {
      const duplicatedMeal = await firstValueFrom(this.createMeal(duplicatedPlan.id, {
        name: meal.name,
        timeLabel: meal.timeLabel,
        orderIndex: meal.orderIndex
      }));

      for (const item of sortByOrder(meal.items)) {
        await firstValueFrom(this.createMealItem(duplicatedMeal.id, {
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
          orderIndex: item.orderIndex
        }));
      }
    }

    return firstValueFrom(this.recalculateMealPlan(duplicatedPlan.id));
  }

  async duplicateMeal(mealPlanId: number, meal: MealPlanMeal): Promise<MealPlanDetail> {
    const sourcePlan = await firstValueFrom(this.findMealPlanById(mealPlanId));
    const sourceMeal = sourcePlan.meals.find((planMeal) => planMeal.id === meal.id);

    if (!sourceMeal) {
      throw new Error('Meal not found');
    }

    const duplicatedMeal = await firstValueFrom(this.createMeal(mealPlanId, {
      name: `${sourceMeal.name} - copia`,
      timeLabel: sourceMeal.timeLabel,
      orderIndex: sourcePlan.meals.length
    }));

    for (const item of sortByOrder(sourceMeal.items)) {
      await firstValueFrom(this.createMealItem(duplicatedMeal.id, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        orderIndex: item.orderIndex
      }));
    }

    return firstValueFrom(this.recalculateMealPlan(mealPlanId));
  }
}

function sortByOrder<TItem extends { orderIndex: number; id: number }>(items: TItem[]): TItem[] {
  return [...items].sort((first, second) => first.orderIndex - second.orderIndex || first.id - second.id);
}
