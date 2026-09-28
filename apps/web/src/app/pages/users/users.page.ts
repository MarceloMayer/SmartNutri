import { HttpErrorResponse } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import type { UserRole, UserStatus } from '../../core/auth/auth.models';
import type { User } from '../../core/models/user.models';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../features/users/services/user.service';

type ViewState = 'idle' | 'loading' | 'error';
type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss'
})
export class UsersPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });
  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email]
  });
  readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.minLength(6)]
  });
  readonly roleControl = new FormControl<UserRole>('patient', {
    nonNullable: true,
    validators: [Validators.required]
  });
  readonly statusControl = new FormControl<UserStatus>('active', {
    nonNullable: true,
    validators: [Validators.required]
  });

  users: User[] = [];
  selectedUser: User | null = null;
  state: ViewState = 'idle';
  formState: ViewState = 'idle';
  formMode: FormMode = 'create';
  message = '';
  rowActionLoadingId: number | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  get roleOptions(): UserRole[] {
    return this.authService.hasAnyRole(['admin'])
      ? ['admin', 'nutritionist', 'patient']
      : ['patient'];
  }

  loadUsers(): void {
    this.state = 'loading';
    this.message = '';

    this.userService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.state = 'idle';
      },
      error: (error: unknown) => {
        this.state = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel listar usuarios.');
      }
    });
  }

  startCreate(): void {
    this.formMode = 'create';
    this.selectedUser = null;
    this.nameControl.setValue('');
    this.emailControl.setValue('');
    this.passwordControl.setValue('');
    this.roleControl.setValue(this.roleOptions.includes('patient') ? 'patient' : this.roleOptions[0]);
    this.statusControl.setValue('active');
    this.message = '';
  }

  startEdit(user: User): void {
    this.formMode = 'edit';
    this.selectedUser = user;
    this.nameControl.setValue(user.name);
    this.emailControl.setValue(user.email);
    this.passwordControl.setValue('');
    this.roleControl.setValue(user.role);
    this.statusControl.setValue(user.status);
    this.message = '';
  }

  saveUser(): void {
    this.nameControl.markAsTouched();
    this.emailControl.markAsTouched();
    this.passwordControl.markAsTouched();
    this.roleControl.markAsTouched();

    if (this.formMode === 'edit') {
      this.statusControl.markAsTouched();
    }

    if (this.nameControl.invalid
      || this.emailControl.invalid
      || this.roleControl.invalid
      || (this.formMode === 'edit' && this.statusControl.invalid)
      || (this.formMode === 'create' && this.passwordControl.value.length < 6)
      || (this.formMode === 'edit' && this.passwordControl.value && this.passwordControl.invalid)) {
      return;
    }

    this.formState = 'loading';
    this.message = '';

    const request = this.formMode === 'edit' && this.selectedUser
      ? this.userService.updateUser(this.selectedUser.id, {
        name: this.nameControl.value.trim(),
        email: this.emailControl.value.trim(),
        role: this.roleControl.value,
        status: this.statusControl.value
      })
      : this.userService.createUser({
        name: this.nameControl.value.trim(),
        email: this.emailControl.value.trim(),
        role: this.roleControl.value,
        password: this.passwordControl.value
      });

    request.subscribe({
      next: () => {
        this.formState = 'idle';
        this.message = this.formMode === 'edit' ? 'Usuario atualizado.' : 'Usuario criado.';
        this.startCreate();
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.formState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel salvar o usuario.');
      }
    });
  }

  toggleUserStatus(user: User): void {
    if (this.rowActionLoadingId !== null) {
      return;
    }

    const nextStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    this.rowActionLoadingId = user.id;
    this.message = '';

    this.userService.updateUser(user.id, { status: nextStatus }).subscribe({
      next: () => {
        this.rowActionLoadingId = null;
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.rowActionLoadingId = null;
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel atualizar o status.');
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
    return this.passwordControl.touched
      && (this.formMode === 'create'
        ? this.passwordControl.value.length < 6
        : this.passwordControl.invalid);
  }

  formatRole(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      nutritionist: 'Nutricionista',
      patient: 'Paciente'
    };

    return labels[role];
  }

  formatStatus(status: UserStatus): string {
    return status === 'active' ? 'Ativo' : 'Inativo';
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
