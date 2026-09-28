import { HttpErrorResponse } from '@angular/common/http';
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

const publicAuthEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export const sessionExpiryInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isPublicAuthEndpoint = publicAuthEndpoints.some((endpoint) => request.url.includes(endpoint));

      if (isUnauthorized && !isPublicAuthEndpoint && authService.isAuthenticated()) {
        authService.logout();
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      return throwError(() => error);
    })
  );
};
