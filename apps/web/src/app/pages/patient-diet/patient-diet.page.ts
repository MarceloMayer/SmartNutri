import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

import type { MealPlanDetail, MealPlanMealWithItems, Patient } from '../../core/models/patient.models';
import { PatientPortalService } from '../../features/patient-portal/services/patient-portal.service';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-patient-diet-page',
  standalone: true,
  imports: [DecimalPipe, NgFor, NgIf],
  templateUrl: './patient-diet.page.html',
  styleUrl: './patient-diet.page.scss'
})
export class PatientDietPage implements OnInit {
  private readonly patientPortalService = inject(PatientPortalService);

  patient: Patient | null = null;
  mealPlan: MealPlanDetail | null = null;
  state: ViewState = 'idle';
  message = '';

  ngOnInit(): void {
    this.loadDiet();
  }

  loadDiet(): void {
    this.state = 'loading';
    this.message = '';

    this.patientPortalService.findDiet().subscribe({
      next: (diet) => {
        this.patient = diet.patient;
        this.mealPlan = diet.mealPlan;
        this.state = 'idle';
      },
      error: (error: unknown) => {
        this.state = 'error';
        this.message = this.resolveErrorMessage(error);
      }
    });
  }

  trackMeal(_index: number, meal: MealPlanMealWithItems): number {
    return meal.id;
  }

  print(): void {
    globalThis.print();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Nao foi possivel carregar sua dieta.';
  }
}
