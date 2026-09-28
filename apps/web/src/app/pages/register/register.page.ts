import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss'
})
export class RegisterPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(160)]
  });

  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email]
  });

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

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    if (this.authService.hasAnyRole(['admin', 'nutritionist'])) {
      void this.router.navigateByUrl(this.returnUrl);
      return;
    }

    void this.router.navigateByUrl('/minha-dieta');
  }

  register(): void {
    this.nameControl.markAsTouched();
    this.emailControl.markAsTouched();
    this.passwordControl.markAsTouched();
    this.confirmPasswordControl.markAsTouched();

    this.confirmMismatch = false;

    if (this.nameControl.invalid
      || this.emailControl.invalid
      || this.passwordControl.invalid
      || this.confirmPasswordControl.invalid) {
      return;
    }

    if (this.passwordControl.value !== this.confirmPasswordControl.value) {
      this.confirmMismatch = true;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.register({
      name: this.nameControl.value.trim(),
      email: this.emailControl.value.trim(),
      password: this.passwordControl.value
    }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.user.role === 'patient') {
          void this.router.navigateByUrl('/minha-dieta');
          return;
        }

        void this.router.navigateByUrl(this.returnUrl);
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveErrorMessage(error);
      }
    });
  }

  get showNameError(): boolean {
    return this.nameControl.touched && this.nameControl.invalid;
  }

  get showEmailError(): boolean {
    return this.emailControl.touched && this.emailControl.invalid;
  }

  get showPasswordError(): boolean {
    return this.passwordControl.touched && this.passwordControl.invalid;
  }

  get showConfirmPasswordError(): boolean {
    return this.confirmPasswordControl.touched && this.confirmPasswordControl.invalid;
  }

  private get returnUrl(): string {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');

    return value?.startsWith('/') ? value : '/nutritionist';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Nao foi possivel criar a conta. Tente novamente.';
  }
}
