import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AuthTokenStore } from '../api/auth-token.store';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  UserRole,
  UserStatus
} from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly userStorageKey = 'smart-nutri.auth-user';
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());

  readonly isAuthenticated$ = this.authenticatedSubject.asObservable();
  readonly currentUser$ = this.currentUserSubject.asObservable();

  isAuthenticated(): boolean {
    return this.hasStoredToken();
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const currentRole = this.getCurrentRole();

    return currentRole !== null && roles.includes(currentRole);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.api.post<AuthResponse, LoginPayload>('/auth/login', payload).pipe(
      tap((response) => {
        this.setAuthenticatedSession(response);
      })
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.api.post<AuthResponse, RegisterPayload>('/auth/register', payload).pipe(
      tap((response) => {
        this.setAuthenticatedSession(response);
      })
    );
  }

  requestPasswordReset(payload: RequestPasswordResetPayload): Observable<{ status: string }> {
    return this.api.post<{ status: string }, RequestPasswordResetPayload>('/auth/forgot-password', payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<{ status: string }> {
    return this.api.post<{ status: string }, ResetPasswordPayload>('/auth/reset-password', payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ status: string }> {
    return this.api.post<{ status: string }, ChangePasswordPayload>('/auth/change-password', payload);
  }

  logout(): void {
    this.tokenStore.setToken(null);
    this.writeStoredUser(null);
    this.currentUserSubject.next(null);
    this.authenticatedSubject.next(false);
  }

  private setAuthenticatedSession(response: AuthResponse): void {
    this.tokenStore.setToken(response.token);
    this.writeStoredUser(response.user);
    this.currentUserSubject.next(response.user);
    this.authenticatedSubject.next(true);
  }

  private hasStoredToken(): boolean {
    return Boolean(this.tokenStore.getToken());
  }

  private getCurrentRole(): UserRole | null {
    return this.currentUserSubject.value?.role ?? this.readRoleFromToken();
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = globalThis.localStorage?.getItem(this.userStorageKey);

    if (!rawUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as Partial<AuthUser>;

      if (typeof parsedUser.id === 'number'
        && typeof parsedUser.name === 'string'
        && typeof parsedUser.email === 'string'
        && this.isUserRole(parsedUser.role)
        && typeof parsedUser.createdAt === 'string'
        && typeof parsedUser.updatedAt === 'string') {
        const status: UserStatus = parsedUser.status === 'inactive' ? 'inactive' : 'active';

        return {
          id: parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          role: parsedUser.role,
          status,
          createdAt: parsedUser.createdAt,
          updatedAt: parsedUser.updatedAt
        };
      }
    } catch {
      this.writeStoredUser(null);
    }

    return null;
  }

  private writeStoredUser(user: AuthUser | null): void {
    if (!user) {
      globalThis.localStorage?.removeItem(this.userStorageKey);
      return;
    }

    globalThis.localStorage?.setItem(this.userStorageKey, JSON.stringify(user));
  }

  private readRoleFromToken(): UserRole | null {
    const token = this.tokenStore.getToken();

    if (!token) {
      return null;
    }

    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    try {
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        Math.ceil(normalizedPayload.length / 4) * 4,
        '='
      );
      const parsedPayload = JSON.parse(globalThis.atob(paddedPayload)) as { role?: unknown };

      return this.isUserRole(parsedPayload.role) ? parsedPayload.role : null;
    } catch {
      return null;
    }
  }

  private isUserRole(value: unknown): value is UserRole {
    return value === 'admin' || value === 'nutritionist' || value === 'patient';
  }
}
