import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss'
})
export class ForgotPasswordPage {
  private readonly authService = inject(AuthService);

  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email]
  });

  isSubmitting = false;
  isSubmitted = false;
  errorMessage = '';

  requestReset(): void {
    this.emailControl.markAsTouched();

    if (this.emailControl.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.requestPasswordReset({
      email: this.emailControl.value.trim()
    }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        this.isSubmitted = true;
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveErrorMessage(error);
      }
    });
  }

  get showEmailError(): boolean {
    return this.emailControl.touched && this.emailControl.invalid;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Não foi possível enviar o email de recuperação. Tente novamente.';
  }
}
