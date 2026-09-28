import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

type ViewState = 'idle' | 'loading' | 'error' | 'success';

@Component({
  selector: 'app-conta-page',
  standalone: true,
  imports: [AsyncPipe, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './conta.page.html',
  styleUrl: './conta.page.scss'
})
export class ContaPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user$ = this.authService.currentUser$;

  readonly currentPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });
  readonly newPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6)]
  });
  readonly confirmPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  state: ViewState = 'idle';
  message = '';

  changePassword(): void {
    this.currentPasswordControl.markAsTouched();
    this.newPasswordControl.markAsTouched();
    this.confirmPasswordControl.markAsTouched();
    this.message = '';

    if (this.currentPasswordControl.invalid
      || this.newPasswordControl.invalid
      || this.confirmPasswordControl.invalid) {
      return;
    }

    if (this.newPasswordControl.value !== this.confirmPasswordControl.value) {
      this.state = 'error';
      this.message = 'A confirmação não coincide com a nova senha.';
      return;
    }

    this.state = 'loading';

    this.authService.changePassword({
      currentPassword: this.currentPasswordControl.value,
      newPassword: this.newPasswordControl.value
    }).subscribe({
      next: () => {
        this.state = 'success';
        this.message = 'Senha atualizada com sucesso.';
        this.currentPasswordControl.reset('');
        this.newPasswordControl.reset('');
        this.confirmPasswordControl.reset('');
      },
      error: (error: unknown) => {
        this.state = 'error';
        this.message = this.resolveErrorMessage(error, 'Não foi possível atualizar a senha.');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
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
