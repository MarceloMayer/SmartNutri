import { HttpErrorResponse } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Patient, PatientSex } from '../../core/models/patient.models';
import { PatientService } from '../../features/patients/services/patient.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputMaskDirective } from '../../shared/directives/input-mask.directive';

type ViewState = 'idle' | 'loading' | 'error';
type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-patients-page',
  standalone: true,
  imports: [ConfirmDialogComponent, InputMaskDirective, NgFor, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './patients.page.html',
  styleUrl: './patients.page.scss'
})
export class PatientsPage implements OnInit {
  private readonly patientService = inject(PatientService);

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });
  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.email]
  });
  readonly phoneControl = new FormControl('', {
    nonNullable: true
  });
  readonly notesControl = new FormControl('', {
    nonNullable: true
  });
  readonly birthDateControl = new FormControl('', {
    nonNullable: true
  });
  readonly sexControl = new FormControl<PatientSex | ''>('', {
    nonNullable: true
  });
  readonly generateAccessControl = new FormControl(false, {
    nonNullable: true
  });

  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  state: ViewState = 'idle';
  formState: ViewState = 'idle';
  formMode: FormMode = 'create';
  message = '';
  generatedPassword = '';
  passwordCopied = false;
  patientPendingDelete: Patient | null = null;

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.state = 'loading';
    this.message = '';

    this.patientService.listPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.state = 'idle';
      },
      error: (error: unknown) => {
        this.state = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel listar pacientes.');
      }
    });
  }

  startCreate(): void {
    this.formMode = 'create';
    this.selectedPatient = null;
    this.nameControl.reset('');
    this.emailControl.reset('');
    this.phoneControl.reset('');
    this.notesControl.reset('');
    this.birthDateControl.reset('');
    this.sexControl.reset('');
    this.generateAccessControl.reset(false);
    this.message = '';
    this.generatedPassword = '';
    this.passwordCopied = false;
  }

  startEdit(patient: Patient): void {
    this.formMode = 'edit';
    this.selectedPatient = patient;
    this.nameControl.setValue(patient.name);
    this.emailControl.setValue(patient.email ?? '');
    this.phoneControl.setValue(patient.phone ?? '');
    this.notesControl.setValue(patient.notes ?? '');
    this.birthDateControl.setValue(isoToDisplay(patient.birthDate));
    this.sexControl.setValue(patient.sex ?? '');
    this.message = '';
    this.generatedPassword = '';
  }

  savePatient(): void {
    this.nameControl.markAsTouched();
    this.emailControl.markAsTouched();

    if (this.nameControl.invalid || this.emailControl.invalid) {
      return;
    }

    if (this.formMode === 'create'
      && this.generateAccessControl.value
      && this.emailControl.value.trim().length === 0) {
      this.emailControl.markAsTouched();
      this.message = 'Informe um email para gerar acesso do paciente.';
      return;
    }

    const payload = {
      name: this.nameControl.value.trim(),
      email: this.emailControl.value.trim() || null,
      phone: this.phoneControl.value.trim() || null,
      notes: this.notesControl.value.trim() || null,
      birthDate: displayToIso(this.birthDateControl.value.trim()),
      sex: (this.sexControl.value as PatientSex) || null,
      generateAccess: this.formMode === 'create' && this.generateAccessControl.value
    };

    this.formState = 'loading';
    this.message = '';

    const request = this.formMode === 'edit' && this.selectedPatient
      ? this.patientService.updatePatient(this.selectedPatient.id, payload)
      : this.patientService.createPatient(payload);

    request.subscribe({
      next: (patient) => {
        const generatedPassword = 'generatedPassword' in patient
          && typeof patient.generatedPassword === 'string'
          ? patient.generatedPassword
          : '';

        this.formState = 'idle';
        const successMessage = this.formMode === 'edit'
          ? 'Paciente atualizado.'
          : generatedPassword
            ? 'Paciente criado com acesso ao sistema.'
            : 'Paciente criado.';
        this.startCreate();
        this.generatedPassword = generatedPassword;
        this.message = successMessage;
        this.loadPatients();
      },
      error: (error: unknown) => {
        this.formState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel salvar o paciente.');
      }
    });
  }

  copyGeneratedPassword(): void {
    if (!this.generatedPassword) {
      return;
    }

    navigator.clipboard.writeText(this.generatedPassword).then(() => {
      this.passwordCopied = true;
      setTimeout(() => {
        this.passwordCopied = false;
      }, 2000);
    }).catch(() => {
      this.message = 'Não foi possível copiar a senha automaticamente. Copie manualmente.';
    });
  }

  confirmDeletePatient(patient: Patient): void {
    this.patientPendingDelete = patient;
  }

  cancelDeletePatient(): void {
    this.patientPendingDelete = null;
  }

  deletePatient(): void {
    const patient = this.patientPendingDelete;

    if (!patient) {
      return;
    }

    this.patientPendingDelete = null;
    this.formState = 'loading';
    this.message = '';

    this.patientService.deletePatient(patient.id).subscribe({
      next: () => {
        this.formState = 'idle';
        this.message = 'Paciente removido.';
        if (this.selectedPatient?.id === patient.id) {
          this.startCreate();
        }
        this.loadPatients();
      },
      error: (error: unknown) => {
        this.formState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel remover o paciente.');
      }
    });
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

/** YYYY-MM-DD → DD/MM/YYYY (para exibição no input com máscara) */
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY → YYYY-MM-DD (para envio à API); retorna null se incompleto */
function displayToIso(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [d, m, y] = display.split('/');
  if (!d || !m || !y || y.length < 4) return null;
  return `${y}-${m}-${d}`;
}
