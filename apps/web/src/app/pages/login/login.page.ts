import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email]
  });

  readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  isSubmitting = false;
  errorMessage = '';

  login(): void {
    this.emailControl.markAsTouched();
    this.passwordControl.markAsTouched();

    if (this.emailControl.invalid || this.passwordControl.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.emailControl.value,
      password: this.passwordControl.value
    }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (response) => {
        const targetUrl = response.user.role === 'patient' && this.returnUrl === '/nutritionist'
          ? '/minha-dieta'
          : this.returnUrl;

        void this.router.navigateByUrl(targetUrl);
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveErrorMessage(error);
      }
    });
  }

  get showEmailError(): boolean {
    return this.emailControl.touched && this.emailControl.invalid;
  }

  get showPasswordError(): boolean {
    return this.passwordControl.touched && this.passwordControl.invalid;
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

    return 'Nao foi possivel entrar com estes dados.';
  }
}
