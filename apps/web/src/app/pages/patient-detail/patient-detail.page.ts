import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe, NgFor, NgIf, ViewportScroller } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { MealPlan, MealPlanStatus, Patient, PatientSex } from '../../core/models/patient.models';
import type { PhysicalEvaluation } from '../../core/models/physical-evaluation.models';
import { PhysicalEvaluationService } from '../../features/physical-evaluations/services/physical-evaluation.service';
import { PatientService } from '../../features/patients/services/patient.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputMaskDirective } from '../../shared/directives/input-mask.directive';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-patient-detail-page',
  standalone: true,
  imports: [ConfirmDialogComponent, DatePipe, DecimalPipe, InputMaskDirective, NgFor, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './patient-detail.page.html',
  styleUrl: './patient-detail.page.scss'
})
export class PatientDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly patientService = inject(PatientService);
  private readonly evaluationService = inject(PhysicalEvaluationService);

  readonly patientNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });
  readonly patientEmailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.email]
  });
  readonly patientPhoneControl = new FormControl('', {
    nonNullable: true
  });
  readonly patientNotesControl = new FormControl('', {
    nonNullable: true
  });
  readonly patientBirthDateControl = new FormControl('', {
    nonNullable: true
  });
  readonly patientSexControl = new FormControl<PatientSex | ''>('', {
    nonNullable: true
  });
  readonly statusLabels: Record<MealPlanStatus, string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    archived: 'Arquivado'
  };

  patient: Patient | null = null;
  mealPlans: MealPlan[] = [];
  evaluations: PhysicalEvaluation[] = [];
  pageState: ViewState = 'idle';
  actionState: ViewState = 'idle';
  mealPlansState: ViewState = 'idle';
  evaluationsState: ViewState = 'idle';
  message = '';
  mealPlansMessage = '';
  evaluationsMessage = '';
  isPatientDeleteConfirmOpen = false;
  evaluationPendingDelete: number | null = null;

  get patientId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.loadPatient();
    this.loadMealPlans();
    this.loadEvaluations();
  }

  loadPatient(): void {
    this.pageState = 'loading';
    this.message = '';

    this.patientService.findPatientById(this.patientId).subscribe({
      next: (patient) => {
        this.patient = patient;
        this.patientNameControl.setValue(patient.name);
        this.patientEmailControl.setValue(patient.email ?? '');
        this.patientPhoneControl.setValue(patient.phone ?? '');
        this.patientNotesControl.setValue(patient.notes ?? '');
        this.patientBirthDateControl.setValue(isoToDisplay(patient.birthDate));
        this.patientSexControl.setValue(patient.sex ?? '');
        this.pageState = 'idle';
        this.scrollToFragmentIfNeeded();
      },
      error: (error: unknown) => {
        this.pageState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel carregar o paciente.');
      }
    });
  }

  savePatient(): void {
    this.patientNameControl.markAsTouched();
    this.patientEmailControl.markAsTouched();

    if (this.patientNameControl.invalid || this.patientEmailControl.invalid) {
      return;
    }

    this.actionState = 'loading';
    this.message = '';

    this.patientService.updatePatient(this.patientId, {
      name: this.patientNameControl.value.trim(),
      email: this.patientEmailControl.value.trim() || null,
      phone: this.patientPhoneControl.value.trim() || null,
      notes: this.patientNotesControl.value.trim() || null,
      birthDate: displayToIso(this.patientBirthDateControl.value.trim()),
      sex: (this.patientSexControl.value as PatientSex) || null
    }).subscribe({
      next: (patient) => {
        this.patient = patient;
        this.actionState = 'idle';
        this.message = 'Paciente atualizado.';
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel atualizar o paciente.');
      }
    });
  }

  confirmDeletePatient(): void {
    this.isPatientDeleteConfirmOpen = true;
  }

  deletePatient(): void {
    this.isPatientDeleteConfirmOpen = false;
    this.actionState = 'loading';
    this.message = '';

    this.patientService.deletePatient(this.patientId).subscribe({
      next: () => {
        void this.router.navigateByUrl('/nutritionist/patients');
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel remover o paciente.');
      }
    });
  }

  loadMealPlans(): void {
    this.mealPlansState = 'loading';
    this.mealPlansMessage = '';

    this.patientService.listMealPlans(this.patientId).subscribe({
      next: (mealPlans) => {
        this.mealPlans = mealPlans;
        this.mealPlansState = 'idle';
      },
      error: (error: unknown) => {
        this.mealPlansState = 'error';
        this.mealPlansMessage = this.resolveErrorMessage(
          error,
          'Nao foi possivel carregar os planos alimentares.'
        );
      }
    });
  }

  loadEvaluations(): void {
    this.evaluationsState = 'loading';
    this.evaluationsMessage = '';

    this.evaluationService.listEvaluations(this.patientId).subscribe({
      next: (evaluations) => {
        this.evaluations = evaluations;
        this.evaluationsState = 'idle';
      },
      error: (error: unknown) => {
        this.evaluationsState = 'error';
        this.evaluationsMessage = this.resolveErrorMessage(
          error,
          'Nao foi possivel carregar as avaliacoes fisicas.'
        );
      }
    });
  }

  confirmDeleteEvaluation(evaluationId: number): void {
    this.evaluationPendingDelete = evaluationId;
  }

  deleteEvaluation(): void {
    const evaluationId = this.evaluationPendingDelete;

    if (evaluationId === null) {
      return;
    }

    this.evaluationPendingDelete = null;
    this.evaluationsState = 'loading';
    this.evaluationsMessage = '';

    this.evaluationService.delete(evaluationId).subscribe({
      next: () => {
        this.evaluations = this.evaluations.filter((e) => e.id !== evaluationId);
        this.evaluationsState = 'idle';
      },
      error: (error: unknown) => {
        this.evaluationsState = 'error';
        this.evaluationsMessage = this.resolveErrorMessage(
          error,
          'Nao foi possivel excluir a avaliacao.'
        );
      }
    });
  }

  statusLabel(status: MealPlanStatus): string {
    return this.statusLabels[status];
  }

  private scrollToFragmentIfNeeded(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;

    // Aguarda um tick para o *ngIf renderizar o elemento com o id
    setTimeout(() => this.scroller.scrollToAnchor(fragment), 80);
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

// ─── Helpers de data ──────────────────────────────────────────────────────────

function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [d, m, y] = display.split('/');
  if (!d || !m || !y || y.length < 4) return null;
  return `${y}-${m}-${d}`;
}
