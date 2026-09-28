import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';

import { AuthTokenStore } from './auth-token.store';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthTokenStore).getToken();

  if (!token) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};
