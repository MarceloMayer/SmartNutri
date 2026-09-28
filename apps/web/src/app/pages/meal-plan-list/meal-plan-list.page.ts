import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { MealPlan, MealPlanStatus, Patient } from '../../core/models/patient.models';
import { PatientService } from '../../features/patients/services/patient.service';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-meal-plan-list-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgFor, NgIf, RouterLink],
  templateUrl: './meal-plan-list.page.html',
  styleUrl: './meal-plan-list.page.scss'
})
export class MealPlanListPage implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);

  readonly statusLabels: Record<MealPlanStatus, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado'
  };

  mealPlans: MealPlan[] = [];
  patientsById = new Map<number, Patient>();
  state: ViewState = 'idle';
  actionState: ViewState = 'idle';
  duplicatingPlanId: number | null = null;
  message = '';

  ngOnInit(): void {
    this.loadMealPlans();
  }

  loadMealPlans(): void {
    this.state = 'loading';
    this.message = '';

    forkJoin({
      mealPlans: this.patientService.listMealPlans(),
      patients: this.patientService.listPatients()
    }).subscribe({
      next: ({ mealPlans, patients }) => {
        this.mealPlans = mealPlans;
        this.patientsById = patients.reduce((patientsById, patient) => {
          patientsById.set(patient.id, patient);
          return patientsById;
        }, new Map<number, Patient>());
        this.state = 'idle';
      },
      error: (error: unknown) => {
        this.state = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel carregar os planos alimentares.');
      }
    });
  }

  patientName(plan: MealPlan): string {
    if (!plan.patientId) {
      return 'Sem paciente';
    }

    return this.patientsById.get(plan.patientId)?.name ?? 'Paciente nao encontrado';
  }

  statusLabel(status: MealPlanStatus): string {
    return this.statusLabels[status];
  }

  async duplicatePlan(plan: MealPlan): Promise<void> {
    this.actionState = 'loading';
    this.duplicatingPlanId = plan.id;
    this.message = '';

    try {
      const duplicatedPlan = await this.patientService.duplicateMealPlan(plan.id);
      this.actionState = 'idle';
      this.duplicatingPlanId = null;
      await this.router.navigate(['/meal-plans', duplicatedPlan.id, 'edit']);
    } catch (error: unknown) {
      this.actionState = 'error';
      this.duplicatingPlanId = null;
      this.message = this.resolveErrorMessage(error, 'Nao foi possivel duplicar o plano alimentar.');
    }
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
