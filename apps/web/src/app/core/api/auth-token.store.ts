import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthTokenStore {
  private readonly storageKey = 'smart-nutri.auth-token';

  getToken(): string | null {
    return globalThis.localStorage?.getItem(this.storageKey) ?? null;
  }

  setToken(token: string | null): void {
    if (!token) {
      globalThis.localStorage?.removeItem(this.storageKey);
      return;
    }

    globalThis.localStorage?.setItem(this.storageKey, token);
  }
}
