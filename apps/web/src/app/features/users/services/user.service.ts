import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type { CreateUserPayload, UpdateUserPayload, User } from '../../../core/models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly api = inject(ApiClientService);

  listUsers(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.api.post<User, CreateUserPayload>('/users', payload);
  }

  findUserById(userId: number): Observable<User> {
    return this.api.get<User>(`/users/${userId}`);
  }

  updateUser(userId: number, payload: UpdateUserPayload): Observable<User> {
    return this.api.patch<User, UpdateUserPayload>(`/users/${userId}`, payload);
  }
}
