import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss'
})
export class ResetPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6), Validators.maxLength(128)]
  });

  readonly confirmPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6), Validators.maxLength(128)]
  });

  isSubmitting = false;
  errorMessage = '';
  confirmMismatch = false;

  resetPassword(): void {
    if (!this.token) {
      this.errorMessage = 'Link de redefinição inválido. Solicite um novo.';
      return;
    }

    this.passwordControl.markAsTouched();
    this.confirmPasswordControl.markAsTouched();
    this.confirmMismatch = false;

    if (this.passwordControl.invalid || this.confirmPasswordControl.invalid) {
      return;
    }

    if (this.passwordControl.value !== this.confirmPasswordControl.value) {
      this.confirmMismatch = true;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.resetPassword({
      token: this.token,
      password: this.passwordControl.value
    }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveErrorMessage(error);
      }
    });
  }

  get showPasswordError(): boolean {
    return this.passwordControl.touched && this.passwordControl.invalid;
  }

  get showConfirmPasswordError(): boolean {
    return this.confirmPasswordControl.touched && this.confirmPasswordControl.invalid;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Não foi possível redefinir a senha. O link pode ter expirado.';
  }
}
